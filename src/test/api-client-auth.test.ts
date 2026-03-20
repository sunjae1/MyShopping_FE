import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  checkout,
  fetchCart,
  fetchItems,
  fetchMyPage,
  fetchSession,
  login,
  resetAuthClientStateForTests,
  toAppErrorMessage
} from "../api/client";
import { subscribeAuthRequired, type AuthRequiredDetail } from "../lib/auth";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function emptyResponse(status = 204): Response {
  return new Response(null, {
    status
  });
}

function createDeferredResponse() {
  let resolve!: (value: Response) => void;

  const promise = new Promise<Response>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve
  };
}

describe("api client auth flow", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    resetAuthClientStateForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    resetAuthClientStateForTests();
    vi.unstubAllGlobals();
  });

  it("returns the nested user from the JWT login response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        accessTokenExpiresInSeconds: 300,
        user: {
          id: 7,
          email: "jwt@example.com",
          name: "JWT 사용자",
          role: "USER"
        }
      })
    );

    await expect(login("jwt@example.com", "password123!")).resolves.toEqual({
      id: 7,
      email: "jwt@example.com",
      name: "JWT 사용자",
      role: "USER"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("retries once after refresh succeeds for a protected request", async () => {
    const authEvents: AuthRequiredDetail[] = [];
    const unsubscribe = subscribeAuthRequired((detail) => {
      authEvents.push(detail);
    });

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "AUTH_REQUIRED",
            message: "로그인이 필요합니다."
          },
          401
        )
      )
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: 1,
            email: "user@example.com",
            name: "사용자",
            role: "USER"
          },
          orders: [],
          posts: [],
          cartItems: []
        })
      );

    await expect(fetchMyPage()).resolves.toMatchObject({
      user: {
        email: "user@example.com"
      }
    });

    unsubscribe();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/api/myPage",
      "/api/auth/refresh",
      "/api/myPage"
    ]);
    expect(authEvents).toHaveLength(0);
  });

  it("shares a single refresh lock across concurrent 401 responses", async () => {
    const refreshDeferred = createDeferredResponse();
    let myPageAttempts = 0;
    let cartAttempts = 0;

    fetchMock.mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/myPage") {
        myPageAttempts += 1;

        return Promise.resolve(
          myPageAttempts === 1
            ? jsonResponse(
                {
                  code: "AUTH_REQUIRED",
                  message: "로그인이 필요합니다."
                },
                401
              )
            : jsonResponse({
                user: {
                  id: 1,
                  email: "user@example.com",
                  name: "사용자",
                  role: "USER"
                },
                orders: [],
                posts: [],
                cartItems: []
              })
        );
      }

      if (url === "/api/cart") {
        cartAttempts += 1;

        return Promise.resolve(
          cartAttempts === 1
            ? jsonResponse(
                {
                  code: "AUTH_REQUIRED",
                  message: "로그인이 필요합니다."
                },
                401
              )
            : jsonResponse({
                cartItems: [],
                allPrice: 0
              })
        );
      }

      if (url === "/api/auth/refresh") {
        return refreshDeferred.promise;
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const myPagePromise = fetchMyPage();
    const cartPromise = fetchCart();

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter((call) => call[0] === "/api/auth/refresh")
      ).toHaveLength(1);
    });

    refreshDeferred.resolve(emptyResponse());

    const [page, cart] = await Promise.all([myPagePromise, cartPromise]);

    expect(page.user.email).toBe("user@example.com");
    expect(cart).toEqual({
      cartItems: [],
      allPrice: 0
    });
    expect(myPageAttempts).toBe(2);
    expect(cartAttempts).toBe(2);
  });

  it("dispatches auth-required only once when refresh fails for concurrent protected requests", async () => {
    const authEvents: AuthRequiredDetail[] = [];
    const unsubscribe = subscribeAuthRequired((detail) => {
      authEvents.push(detail);
    });

    let myPageAttempts = 0;
    let checkoutAttempts = 0;

    fetchMock.mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/myPage") {
        myPageAttempts += 1;
        return Promise.resolve(
          jsonResponse(
            {
              code: "AUTH_REQUIRED",
              message: "로그인이 필요합니다."
            },
            401
          )
        );
      }

      if (url === "/api/orders") {
        checkoutAttempts += 1;
        return Promise.resolve(
          jsonResponse(
            {
              code: "AUTH_REQUIRED",
              message: "로그인이 필요합니다."
            },
            401
          )
        );
      }

      if (url === "/api/auth/refresh") {
        return Promise.resolve(
          jsonResponse(
            {
              code: "INVALID_REFRESH_TOKEN",
              message: "리프레시 토큰이 유효하지 않습니다."
            },
            401
          )
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    const results = await Promise.allSettled([fetchMyPage(), checkout()]);

    unsubscribe();

    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");
    expect(
      fetchMock.mock.calls.filter((call) => call[0] === "/api/auth/refresh")
    ).toHaveLength(1);
    expect(authEvents).toHaveLength(1);
    expect(authEvents[0]).toMatchObject({
      message: "로그인이 필요합니다.",
      reason: "auth"
    });
    expect(myPageAttempts).toBe(1);
    expect(checkoutAttempts).toBe(1);
  });

  it("silently refreshes session bootstrap when access token is missing but refresh succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "AUTH_REQUIRED",
            message: "로그인이 필요합니다."
          },
          401
        )
      )
      .mockResolvedValueOnce(emptyResponse())
      .mockResolvedValueOnce(
        jsonResponse({
          userDto: {
            id: 3,
            email: "restored@example.com",
            name: "복구 사용자",
            role: "USER"
          },
          itemDto: []
        })
      );

    await expect(fetchSession()).resolves.toEqual({
      user: {
        id: 3,
        email: "restored@example.com",
        name: "복구 사용자",
        role: "USER"
      },
      items: []
    });
  });

  it("rejects an empty myPage body with a controlled error", async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(200));

    await expect(fetchMyPage()).rejects.toThrow("마이페이지 응답 형식이 올바르지 않습니다.");
  });

  it("rejects an empty items body with a controlled error", async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(200));

    await expect(fetchItems()).rejects.toThrow("상품 목록 응답 형식이 올바르지 않습니다.");
  });

  it("sanitizes raw backend SQL errors into a friendly message", () => {
    const error = new ApiError(
      500,
      "could not execute statement [Data truncation: Data too long for column 'content' at row 1] [insert into post (author,content,created_date,title,user_id) values (?,?,?,?,?)]"
    );

    expect(toAppErrorMessage(error, "게시글 등록에 실패했습니다.")).toBe(
      "입력한 내용이 너무 깁니다. 내용을 조금 줄여 다시 시도해 주세요."
    );
  });
});
