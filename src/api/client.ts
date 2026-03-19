import { dispatchAuthRequired } from "../lib/auth";
import type {
  Cart,
  Category,
  Comment,
  Item,
  ItemMutationInput,
  LoginResponse,
  MyPage,
  Order,
  Post,
  RawPost,
  RawUserResponse,
  SessionPayload,
  User
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const REFRESH_PATH = "/api/auth/refresh";
const LOGOUT_PATH = "/api/auth/logout";
type AuthPolicy = "default" | "protected";

interface RequestOptions {
  authPolicy?: AuthPolicy;
  authMessage?: string;
  hasRetriedAfterRefresh?: boolean;
  skipAuthRefresh?: boolean;
}

let refreshLock: Promise<void> | null = null;
let authRequiredDispatchScheduled = false;

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function isRefreshCandidate(path: string, options: RequestOptions): boolean {
  if (options.skipAuthRefresh || options.hasRetriedAfterRefresh) {
    return false;
  }

  return (
    path !== "/api/login" &&
    path !== "/api/register" &&
    path !== REFRESH_PATH &&
    path !== LOGOUT_PATH
  );
}

function toMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const message = Reflect.get(payload, "message");
    if (typeof message === "string" && message.trim()) {
      return message;
    }

    const error = Reflect.get(payload, "error");
    if (typeof error === "string" && error.trim()) {
      return error;
    }

    const title = Reflect.get(payload, "title");
    if (typeof title === "string" && title.trim()) {
      return title;
    }
  }

  return fallback;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  return text;
}

async function fetchWithCredentials(
  path: string,
  init: RequestInit
): Promise<Response> {
  return fetch(buildUrl(path), {
    credentials: "include",
    ...init
  });
}

function scheduleAuthRequiredDispatch(message: string): void {
  if (authRequiredDispatchScheduled) {
    return;
  }

  authRequiredDispatchScheduled = true;

  dispatchAuthRequired({
    message
  });

  queueMicrotask(() => {
    authRequiredDispatchScheduled = false;
  });
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshLock) {
    refreshLock = (async () => {
      const response = await fetchWithCredentials(REFRESH_PATH, {
        method: "POST"
      });
      const payload = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          response.status,
          toMessage(payload, `인증 갱신에 실패했습니다. (${response.status})`),
          payload
        );
      }
    })().finally(() => {
      refreshLock = null;
    });
  }

  return refreshLock;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {}
): Promise<T> {
  const response = await fetchWithCredentials(path, init);
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 401 && isRefreshCandidate(path, options)) {
      try {
        await refreshAccessToken();

        return request<T>(path, init, {
          ...options,
          hasRetriedAfterRefresh: true
        });
      } catch {
        // Fall through and handle the original unauthorized response below.
      }
    }

    const error = new ApiError(
      response.status,
      toMessage(payload, `요청에 실패했습니다. (${response.status})`),
      payload
    );

    if (response.status === 401 && options.authPolicy === "protected") {
      scheduleAuthRequiredDispatch(options.authMessage ?? "로그인이 필요합니다.");
    }

    throw error;
  }

  return payload as T;
}

function buildItemQuery(filters?: {
  keyword?: string;
  categoryId?: number | null;
}): string {
  if (!filters) {
    return "/api/items";
  }

  const searchParams = new URLSearchParams();

  if (filters.keyword?.trim()) {
    searchParams.set("keyword", filters.keyword.trim());
  }

  if (typeof filters.categoryId === "number") {
    searchParams.set("categoryId", String(filters.categoryId));
  }

  const queryString = searchParams.toString();

  return queryString ? `/api/items?${queryString}` : "/api/items";
}

function toItemFormData(input: ItemMutationInput): FormData {
  const formData = new FormData();
  formData.set("itemName", input.itemName);
  formData.set("price", String(input.price));
  formData.set("quantity", String(input.quantity));
  formData.set("categoryId", String(input.categoryId));

  if (input.imageFile) {
    formData.set("imageFile", input.imageFile);
  }

  return formData;
}

function normalizeCart(cart: Partial<Cart> | null | undefined): Cart {
  return {
    cartItems: cart?.cartItems ?? [],
    allPrice:
      typeof cart?.allPrice === "number"
        ? cart.allPrice
        : (cart?.cartItems ?? []).reduce((sum, cartItem) => {
            return sum + cartItem.item.price * cartItem.quantity;
          }, 0)
  };
}

function normalizePost(post: RawPost): Post {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author ?? post.authorName ?? "Unknown",
    comments: post.comments ?? [],
    createdDate: post.createdDate
  };
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function toAppErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다."
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "로그인 후 이용해 주세요.";
    }

    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function fetchSession(): Promise<SessionPayload> {
  try {
    const response = await request<RawUserResponse>("/api");

    return {
      user: response.userDto,
      items: response.itemDto
    };
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return {
        user: null,
        items: []
      };
    }

    throw error;
  }
}

export async function login(email: string, password: string): Promise<User> {
  const response = await request<LoginResponse>(
    "/api/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    },
    {
      skipAuthRefresh: true
    }
  );

  return response.user;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  return request<User>("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
}

export async function logout(): Promise<void> {
  await request(
    LOGOUT_PATH,
    {
      method: "POST"
    },
    {
      skipAuthRefresh: true
    }
  );
}

export async function fetchItems(filters?: {
  keyword?: string;
  categoryId?: number | null;
}): Promise<Item[]> {
  return request<Item[]>(buildItemQuery(filters));
}

export async function fetchItem(itemId: number): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`);
}

export async function fetchCategories(): Promise<Category[]> {
  return request<Category[]>("/api/categories");
}

export async function createItem(input: ItemMutationInput): Promise<Item> {
  return request<Item>(
    "/api/items",
    {
      method: "POST",
      body: toItemFormData(input)
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function updateItem(itemId: number, input: ItemMutationInput): Promise<Item> {
  return request<Item>(
    `/api/items/${itemId}`,
    {
      method: "PUT",
      body: toItemFormData(input)
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function deleteItem(itemId: number): Promise<void> {
  await request(
    `/api/items/${itemId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function fetchCart(): Promise<Cart> {
  try {
    const cart = await request<Cart>("/api/cart", {}, {
      authPolicy: "protected"
    });
    return normalizeCart(cart);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return normalizeCart(null);
    }

    throw error;
  }
}

export async function addToCart(itemId: number, quantity: number): Promise<Cart> {
  const cart = await request<Cart>(
    `/api/cart/items/${itemId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: itemId,
        quantity,
        price: 0
      })
    },
    {
      authPolicy: "protected"
    }
  );

  return normalizeCart(cart);
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const cart = await request<Cart>(
    `/api/cart/items/${itemId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );

  return normalizeCart(cart);
}

export async function checkout(): Promise<Order> {
  return request<Order>(
    "/api/orders",
    {
      method: "POST"
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function cancelOrder(orderId: number): Promise<Order> {
  return request<Order>(
    `/api/orders/${orderId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function fetchMyPage(): Promise<MyPage> {
  const page = await request<MyPage>(
    "/api/myPage",
    {},
    {
      authPolicy: "protected"
    }
  );

  return {
    ...page,
    posts: (page.posts ?? []).map((post) => normalizePost(post as RawPost))
  };
}

export async function updateProfile(input: {
  name: string;
  email: string;
}): Promise<User> {
  return request<User>(
    "/api/users",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function fetchPosts(): Promise<Post[]> {
  const posts = await request<RawPost[]>("/api/posts");
  return posts.map(normalizePost);
}

export async function fetchPost(postId: number): Promise<Post> {
  const post = await request<RawPost>(`/api/posts/${postId}`);
  return normalizePost(post);
}

export async function createPost(input: {
  title: string;
  content: string;
}): Promise<Post> {
  const post = await request<RawPost>(
    "/api/posts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    },
    {
      authPolicy: "protected"
    }
  );

  return normalizePost(post);
}

export async function updatePost(
  postId: number,
  input: { title: string; content: string }
): Promise<Post> {
  const post = await request<RawPost>(
    `/api/posts/${postId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    },
    {
      authPolicy: "protected"
    }
  );

  return normalizePost(post);
}

export async function deletePost(postId: number): Promise<void> {
  await request(
    `/api/posts/${postId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function createComment(postId: number, content: string): Promise<Comment> {
  return request<Comment>(
    `/api/posts/${postId}/comments`,
    {
      method: "POST",
      body: new URLSearchParams({
        reply_content: content
      })
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function updateComment(
  postId: number,
  commentId: number,
  content: string
): Promise<Comment> {
  return request<Comment>(
    `/api/posts/${postId}/comments/${commentId}`,
    {
      method: "PUT",
      body: new URLSearchParams({
        reply_content: content
      })
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  await request(
    `/api/posts/${postId}/comments/${commentId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );
}

export function resetAuthClientStateForTests(): void {
  refreshLock = null;
  authRequiredDispatchScheduled = false;
}
