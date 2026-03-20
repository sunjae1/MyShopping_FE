import { dispatchAuthRequired } from "../lib/auth";
import {
  DemoApiError,
  addToCartDemo,
  cancelOrderDemo,
  checkoutDemo,
  createCategoryDemo,
  createCommentDemo,
  createItemDemo,
  createPostDemo,
  deleteCategoryDemo,
  deleteCommentDemo,
  deleteItemDemo,
  deletePostDemo,
  fetchCartDemo,
  fetchCategoriesDemo,
  fetchItemDemo,
  fetchItemsDemo,
  fetchMyPageDemo,
  fetchPostDemo,
  fetchPostsDemo,
  fetchSessionDemo,
  loginDemo,
  logoutDemo,
  registerDemo,
  removeCartItemDemo,
  resetDemoClientState,
  updateCategoryDemo,
  updateCommentDemo,
  updateItemDemo,
  updatePostDemo,
  updateProfileDemo
} from "./demoClient";
import type {
  Cart,
  CartItem,
  Category,
  Comment,
  Item,
  ItemMutationInput,
  MyPage,
  Order,
  OrderItem,
  Post,
  SessionPayload,
  User
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_DEMO_DATA = import.meta.env.VITE_USE_DEMO_DATA === "true";
const REFRESH_PATH = "/api/auth/refresh";
const LOGOUT_PATH = "/api/auth/logout";
type AuthPolicy = "default" | "protected";
type UnknownRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requireRecord(payload: unknown, message: string): UnknownRecord {
  if (!isRecord(payload)) {
    throw new Error(message);
  }

  return payload;
}

function requireArray(payload: unknown, message: string): unknown[] {
  if (!Array.isArray(payload)) {
    throw new Error(message);
  }

  return payload;
}

function normalizeUser(payload: unknown): User | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const email = asString(payload.email);
  const name = asString(payload.name);
  const role = payload.role;

  if (
    id === null ||
    !email ||
    !name ||
    (role !== "USER" && role !== "ADMIN")
  ) {
    return null;
  }

  return {
    id,
    email,
    name,
    role
  };
}

function normalizeItem(payload: unknown): Item | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const itemName = asString(payload.itemName);
  const price = asNumber(payload.price);
  const quantity = asNumber(payload.quantity);

  if (id === null || !itemName || price === null || quantity === null) {
    return null;
  }

  return {
    id,
    itemName,
    price,
    quantity,
    categoryId: asNumber(payload.categoryId),
    categoryName: asString(payload.categoryName),
    imageUrl: asString(payload.imageUrl)
  };
}

function normalizeItems(payload: unknown, message: string): Item[] {
  return requireArray(payload, message)
    .map((item) => normalizeItem(item))
    .filter((item): item is Item => item !== null);
}

function normalizeCategory(payload: unknown): Category | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const name = asString(payload.name);

  if (id === null || !name) {
    return null;
  }

  const itemCount = asNumber(payload.itemCount);

  return {
    id,
    name,
    representativeImageUrl: asString(payload.representativeImageUrl),
    itemCount: itemCount ?? undefined
  };
}

function normalizeCategories(payload: unknown, message: string): Category[] {
  return requireArray(payload, message)
    .map((category) => normalizeCategory(category))
    .filter((category): category is Category => category !== null);
}

function normalizeCartItem(payload: unknown): CartItem | null {
  if (!isRecord(payload)) {
    return null;
  }

  const item = normalizeItem(payload.item);
  const quantity = asNumber(payload.quantity);

  if (!item || quantity === null) {
    return null;
  }

  return {
    item,
    quantity
  };
}

function normalizeOrderItem(payload: unknown): OrderItem | null {
  if (!isRecord(payload)) {
    return null;
  }

  const itemName = asString(payload.itemName);
  const price = asNumber(payload.price);
  const quantity = asNumber(payload.quantity);

  if (!itemName || price === null || quantity === null) {
    return null;
  }

  return {
    itemName,
    price,
    quantity
  };
}

function normalizeOrder(payload: unknown): Order | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const orderDate = asString(payload.orderDate);
  const status = asString(payload.status);

  if (id === null || !orderDate || !status) {
    return null;
  }

  return {
    id,
    orderDate,
    status,
    orderItems: Array.isArray(payload.orderItems)
      ? payload.orderItems
          .map((orderItem) => normalizeOrderItem(orderItem))
          .filter((orderItem): orderItem is OrderItem => orderItem !== null)
      : []
  };
}

function normalizeOrders(payload: unknown, message: string): Order[] {
  return requireArray(payload, message)
    .map((order) => normalizeOrder(order))
    .filter((order): order is Order => order !== null);
}

function normalizeComment(payload: unknown): Comment | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const content = asString(payload.content);
  const username = asString(payload.username);
  const createdDate = asString(payload.createdDate);

  if (id === null || !content || !username || !createdDate) {
    return null;
  }

  return {
    id,
    content,
    username,
    createdDate
  };
}

function normalizePost(payload: unknown): Post | null {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asNumber(payload.id);
  const title = asString(payload.title);
  const content = asString(payload.content);
  const createdDate = asString(payload.createdDate);

  if (id === null || !title || !content || !createdDate) {
    return null;
  }

  return {
    id,
    title,
    content,
    author: asString(payload.author) ?? asString(payload.authorName) ?? "Unknown",
    comments: Array.isArray(payload.comments)
      ? payload.comments
          .map((comment) => normalizeComment(comment))
          .filter((comment): comment is Comment => comment !== null)
      : [],
    createdDate
  };
}

function normalizePosts(payload: unknown, message: string): Post[] {
  return requireArray(payload, message)
    .map((post) => normalizePost(post))
    .filter((post): post is Post => post !== null);
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

function sanitizeBackendErrorMessage(message: string, fallback: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("data truncation") ||
    normalized.includes("too long for column") ||
    normalized.includes("value too long")
  ) {
    return "입력한 내용이 너무 깁니다. 내용을 조금 줄여 다시 시도해 주세요.";
  }

  if (
    normalized.includes("could not execute statement") ||
    normalized.includes("insert into ") ||
    normalized.includes("update ") ||
    normalized.includes("delete from ") ||
    normalized.includes("sql [")
  ) {
    return fallback;
  }

  return message;
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

function normalizeCart(cart: unknown): Cart {
  if (!isRecord(cart)) {
    return {
      cartItems: [],
      allPrice: 0
    };
  }

  const cartItems = Array.isArray(cart.cartItems)
    ? cart.cartItems
        .map((cartItem) => normalizeCartItem(cartItem))
        .filter((cartItem): cartItem is CartItem => cartItem !== null)
    : [];
  const allPrice = asNumber(cart.allPrice);

  return {
    cartItems,
    allPrice:
      allPrice ??
      cartItems.reduce((sum, cartItem) => {
        return sum + cartItem.item.price * cartItem.quantity;
      }, 0)
  };
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiError || error instanceof DemoApiError) {
    return error.status === 401;
  }

  return isRecord(error) && asNumber(error.status) === 401;
}

export function isDemoModeEnabled(): boolean {
  return USE_DEMO_DATA;
}

export function toAppErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다."
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "로그인 후 이용해 주세요.";
    }

    return sanitizeBackendErrorMessage(error.message, fallback);
  }

  if (error instanceof Error && error.message) {
    return sanitizeBackendErrorMessage(error.message, fallback);
  }

  return fallback;
}

export async function fetchSession(): Promise<SessionPayload> {
  if (USE_DEMO_DATA) {
    return fetchSessionDemo();
  }

  try {
    const response = requireRecord(
      await request<unknown>("/api"),
      "세션 응답 형식이 올바르지 않습니다."
    );
    const user = normalizeUser(response.userDto);

    if (!user) {
      throw new Error("세션 사용자 정보가 올바르지 않습니다.");
    }

    return {
      user,
      items: normalizeItems(response.itemDto, "세션 상품 목록 형식이 올바르지 않습니다.")
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
  if (USE_DEMO_DATA) {
    return loginDemo(email, password);
  }

  const response = requireRecord(
    await request<unknown>(
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
    ),
    "로그인 응답 형식이 올바르지 않습니다."
  );
  const user = normalizeUser(response.user);

  if (!user) {
    throw new Error("로그인 사용자 정보가 올바르지 않습니다.");
  }

  return user;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  if (USE_DEMO_DATA) {
    return registerDemo(input);
  }

  const user = normalizeUser(
    await request<unknown>("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    })
  );

  if (!user) {
    throw new Error("회원가입 응답 형식이 올바르지 않습니다.");
  }

  return user;
}

export async function logout(): Promise<void> {
  if (USE_DEMO_DATA) {
    return logoutDemo();
  }

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
  if (USE_DEMO_DATA) {
    return fetchItemsDemo(filters);
  }

  return normalizeItems(
    await request<unknown>(buildItemQuery(filters)),
    "상품 목록 응답 형식이 올바르지 않습니다."
  );
}

export async function fetchItem(itemId: number): Promise<Item> {
  if (USE_DEMO_DATA) {
    return fetchItemDemo(itemId);
  }

  const item = normalizeItem(await request<unknown>(`/api/items/${itemId}`));

  if (!item) {
    throw new Error("상품 응답 형식이 올바르지 않습니다.");
  }

  return item;
}

export async function fetchCategories(): Promise<Category[]> {
  if (USE_DEMO_DATA) {
    return fetchCategoriesDemo();
  }

  return normalizeCategories(
    await request<unknown>("/api/categories"),
    "카테고리 목록 응답 형식이 올바르지 않습니다."
  );
}

export async function createCategory(input: { name: string }): Promise<Category> {
  if (USE_DEMO_DATA) {
    return createCategoryDemo(input);
  }

  const category = normalizeCategory(
    await request<unknown>(
      "/api/categories",
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
    )
  );

  if (!category) {
    throw new Error("카테고리 생성 응답 형식이 올바르지 않습니다.");
  }

  return category;
}

export async function updateCategory(
  categoryId: number,
  input: { name: string }
): Promise<Category> {
  if (USE_DEMO_DATA) {
    return updateCategoryDemo(categoryId, input);
  }

  const category = normalizeCategory(
    await request<unknown>(
      `/api/categories/${categoryId}`,
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
    )
  );

  if (!category) {
    throw new Error("카테고리 수정 응답 형식이 올바르지 않습니다.");
  }

  return category;
}

export async function deleteCategory(categoryId: number): Promise<void> {
  if (USE_DEMO_DATA) {
    return deleteCategoryDemo(categoryId);
  }

  await request(
    `/api/categories/${categoryId}`,
    {
      method: "DELETE"
    },
    {
      authPolicy: "protected"
    }
  );
}

export async function createItem(input: ItemMutationInput): Promise<Item> {
  if (USE_DEMO_DATA) {
    return createItemDemo(input);
  }

  const item = normalizeItem(
    await request<unknown>(
      "/api/items",
      {
        method: "POST",
        body: toItemFormData(input)
      },
      {
        authPolicy: "protected"
      }
    )
  );

  if (!item) {
    throw new Error("상품 생성 응답 형식이 올바르지 않습니다.");
  }

  return item;
}

export async function updateItem(itemId: number, input: ItemMutationInput): Promise<Item> {
  if (USE_DEMO_DATA) {
    return updateItemDemo(itemId, input);
  }

  const item = normalizeItem(
    await request<unknown>(
      `/api/items/${itemId}`,
      {
        method: "PUT",
        body: toItemFormData(input)
      },
      {
        authPolicy: "protected"
      }
    )
  );

  if (!item) {
    throw new Error("상품 수정 응답 형식이 올바르지 않습니다.");
  }

  return item;
}

export async function deleteItem(itemId: number): Promise<void> {
  if (USE_DEMO_DATA) {
    return deleteItemDemo(itemId);
  }

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
  if (USE_DEMO_DATA) {
    try {
      return await fetchCartDemo();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return normalizeCart(null);
      }

      throw error;
    }
  }

  try {
    const cart = await request<unknown>("/api/cart", {}, {
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
  if (USE_DEMO_DATA) {
    return addToCartDemo(itemId, quantity);
  }

  const cart = await request<unknown>(
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
  if (USE_DEMO_DATA) {
    return removeCartItemDemo(itemId);
  }

  const cart = await request<unknown>(
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
  if (USE_DEMO_DATA) {
    return checkoutDemo();
  }

  const order = normalizeOrder(
    await request<unknown>(
      "/api/orders",
      {
        method: "POST"
      },
      {
        authPolicy: "protected"
      }
    )
  );

  if (!order) {
    throw new Error("주문 응답 형식이 올바르지 않습니다.");
  }

  return order;
}

export async function cancelOrder(orderId: number): Promise<Order> {
  if (USE_DEMO_DATA) {
    return cancelOrderDemo(orderId);
  }

  const order = normalizeOrder(
    await request<unknown>(
      `/api/orders/${orderId}`,
      {
        method: "DELETE"
      },
      {
        authPolicy: "protected"
      }
    )
  );

  if (!order) {
    throw new Error("주문 취소 응답 형식이 올바르지 않습니다.");
  }

  return order;
}

export async function fetchMyPage(): Promise<MyPage> {
  if (USE_DEMO_DATA) {
    return fetchMyPageDemo();
  }

  const page = requireRecord(
    await request<unknown>(
      "/api/myPage",
      {},
      {
        authPolicy: "protected"
      }
    ),
    "마이페이지 응답 형식이 올바르지 않습니다."
  );
  const user = normalizeUser(page.user);

  if (!user) {
    throw new Error("마이페이지 사용자 정보가 올바르지 않습니다.");
  }

  return {
    user,
    orders: Array.isArray(page.orders)
      ? normalizeOrders(page.orders, "주문 목록 응답 형식이 올바르지 않습니다.")
      : [],
    posts: Array.isArray(page.posts)
      ? normalizePosts(page.posts, "게시물 목록 응답 형식이 올바르지 않습니다.")
      : [],
    cartItems: Array.isArray(page.cartItems)
      ? normalizeItems(page.cartItems, "장바구니 상품 응답 형식이 올바르지 않습니다.")
      : []
  };
}

export async function updateProfile(input: {
  name: string;
  email: string;
}): Promise<User> {
  if (USE_DEMO_DATA) {
    return updateProfileDemo(input);
  }

  const user = normalizeUser(
    await request<unknown>(
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
    )
  );

  if (!user) {
    throw new Error("회원 정보 응답 형식이 올바르지 않습니다.");
  }

  return user;
}

export async function fetchPosts(): Promise<Post[]> {
  if (USE_DEMO_DATA) {
    return fetchPostsDemo();
  }

  return normalizePosts(
    await request<unknown>("/api/posts"),
    "게시물 목록 응답 형식이 올바르지 않습니다."
  );
}

export async function fetchPost(postId: number): Promise<Post> {
  if (USE_DEMO_DATA) {
    return fetchPostDemo(postId);
  }

  const post = normalizePost(await request<unknown>(`/api/posts/${postId}`));

  if (!post) {
    throw new Error("게시물 응답 형식이 올바르지 않습니다.");
  }

  return post;
}

export async function createPost(input: {
  title: string;
  content: string;
}): Promise<Post> {
  if (USE_DEMO_DATA) {
    return createPostDemo(input);
  }

  const post = normalizePost(
    await request<unknown>(
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
    )
  );

  if (!post) {
    throw new Error("게시물 생성 응답 형식이 올바르지 않습니다.");
  }

  return post;
}

export async function updatePost(
  postId: number,
  input: { title: string; content: string }
): Promise<Post> {
  if (USE_DEMO_DATA) {
    return updatePostDemo(postId, input);
  }

  const post = normalizePost(
    await request<unknown>(
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
    )
  );

  if (!post) {
    throw new Error("게시물 수정 응답 형식이 올바르지 않습니다.");
  }

  return post;
}

export async function deletePost(postId: number): Promise<void> {
  if (USE_DEMO_DATA) {
    return deletePostDemo(postId);
  }

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
  if (USE_DEMO_DATA) {
    return createCommentDemo(postId, content);
  }

  const comment = normalizeComment(
    await request<unknown>(
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
    )
  );

  if (!comment) {
    throw new Error("댓글 응답 형식이 올바르지 않습니다.");
  }

  return comment;
}

export async function updateComment(
  postId: number,
  commentId: number,
  content: string
): Promise<Comment> {
  if (USE_DEMO_DATA) {
    return updateCommentDemo(postId, commentId, content);
  }

  const comment = normalizeComment(
    await request<unknown>(
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
    )
  );

  if (!comment) {
    throw new Error("댓글 응답 형식이 올바르지 않습니다.");
  }

  return comment;
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  if (USE_DEMO_DATA) {
    return deleteCommentDemo(postId, commentId);
  }

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
  resetDemoClientState();
}
