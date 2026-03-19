import type { Page, Request, Route } from "@playwright/test";
import type {
  Cart,
  Category,
  Comment,
  Item,
  MyPage,
  Order,
  Post,
  User
} from "../../src/api/types";

type SessionMode = "guest" | "authenticated" | "expired";

interface StoredCredentials {
  password: string;
  user: User;
}

interface MockApiState {
  user: User;
  sessionMode: SessionMode;
  refreshAvailable: boolean;
  refreshCount: number;
  nextRefreshFailure: {
    code: string;
    message: string;
  } | null;
  items: Item[];
  categories: Category[];
  posts: Post[];
  cart: Cart;
  orders: Order[];
  credentials: Map<string, StoredCredentials>;
}

export interface MockApiControls {
  expireAccess(): void;
  failNextRefresh(code?: string, message?: string): void;
  getRefreshCount(): number;
  getState(): {
    cart: Cart;
    orders: Order[];
    posts: Post[];
    user: User;
    items: Item[];
  };
}

export interface MockApiOptions {
  startAuthenticated?: boolean;
  startExpired?: boolean;
  startAsAdmin?: boolean;
}

function iso(value: string): string {
  return new Date(value).toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function syncCategoryMetadata(state: MockApiState) {
  state.categories = state.categories.map((category) => {
    const categoryItems = state.items.filter((item) => item.categoryId === category.id);

    return {
      ...category,
      itemCount: categoryItems.length,
      representativeImageUrl: categoryItems[0]?.imageUrl ?? null
    };
  });

  state.items = state.items.map((item) => {
    const category = state.categories.find((entry) => entry.id === item.categoryId);

    return {
      ...item,
      categoryName: category?.name ?? null
    };
  });
}

function createInitialState(options: MockApiOptions = {}): MockApiState {
  const memberUser: User = {
    id: 1,
    email: "member@example.com",
    name: "멤버",
    role: "USER"
  };
  const adminUser: User = {
    id: 99,
    email: "admin@example.com",
    name: "관리자",
    role: "ADMIN"
  };
  const items: Item[] = [
    {
      id: 1,
      itemName: "Alpha Coat",
      price: 189000,
      quantity: 6,
      categoryId: 1,
      categoryName: "Outer",
      imageUrl: "/brand-mark.svg"
    },
    {
      id: 2,
      itemName: "Bravo Knit",
      price: 129000,
      quantity: 3,
      categoryId: 2,
      categoryName: "Knit",
      imageUrl: "/brand-mark.svg"
    },
    {
      id: 3,
      itemName: "City Bag",
      price: 99000,
      quantity: 8,
      categoryId: 3,
      categoryName: "Bag",
      imageUrl: "/brand-mark.svg"
    }
  ];
  const categories: Category[] = [
    { id: 1, name: "Outer", itemCount: 0, representativeImageUrl: null },
    { id: 2, name: "Knit", itemCount: 0, representativeImageUrl: null },
    { id: 3, name: "Bag", itemCount: 0, representativeImageUrl: null }
  ];
  const posts: Post[] = [
    {
      id: 1,
      title: "봄 신상 후기",
      content: "알파 코트 핏이 꽤 만족스럽습니다.",
      author: "멤버",
      createdDate: iso("2026-03-18T09:00:00+09:00"),
      comments: [
        {
          id: 1,
          content: "사진도 궁금하네요.",
          username: "운영자",
          createdDate: iso("2026-03-18T10:00:00+09:00")
        }
      ]
    },
    {
      id: 2,
      title: "배송 문의",
      content: "브라보 니트 배송 시작하셨나요?",
      author: "운영자",
      createdDate: iso("2026-03-17T13:00:00+09:00"),
      comments: []
    }
  ];

  const state: MockApiState = {
    user: options.startAsAdmin ? adminUser : memberUser,
    sessionMode: options.startAuthenticated
      ? options.startExpired
        ? "expired"
        : "authenticated"
      : "guest",
    refreshAvailable: Boolean(options.startAuthenticated),
    refreshCount: 0,
    nextRefreshFailure: null,
    items,
    categories,
    posts,
    cart: {
      cartItems: [],
      allPrice: 0
    },
    orders: [],
    credentials: new Map([
      [
        memberUser.email,
        {
          password: "password123!",
          user: memberUser
        }
      ],
      [
        adminUser.email,
        {
          password: "password123!",
          user: adminUser
        }
      ]
    ])
  };

  syncCategoryMetadata(state);

  return state;
}

function json(route: Route, status: number, payload: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(payload)
  });
}

function noContent(route: Route, status = 204) {
  return route.fulfill({
    status,
    body: ""
  });
}

function unauthorized(route: Route, code = "AUTH_REQUIRED", message = "로그인이 필요합니다.") {
  return json(route, 401, {
    code,
    message
  });
}

function forbidden(route: Route, message = "권한이 없습니다.") {
  return json(route, 403, {
    code: "ACCESS_DENIED",
    message
  });
}

function notFound(route: Route, message = "대상을 찾을 수 없습니다.") {
  return json(route, 404, {
    code: "NOT_FOUND",
    message
  });
}

function badRequest(route: Route, message = "잘못된 요청입니다.") {
  return json(route, 400, {
    code: "BAD_REQUEST",
    message
  });
}

function cartTotal(cart: Cart): number {
  return cart.cartItems.reduce((sum, cartItem) => {
    return sum + cartItem.item.price * cartItem.quantity;
  }, 0);
}

function buildMyPage(state: MockApiState): MyPage {
  return {
    user: clone(state.user),
    orders: clone(state.orders),
    posts: clone(state.posts.filter((post) => post.author === state.user.name)),
    cartItems: clone(state.cart.cartItems.map((cartItem) => cartItem.item))
  };
}

function canAccessProtectedApi(state: MockApiState): boolean {
  return state.sessionMode === "authenticated";
}

function isAdmin(state: MockApiState): boolean {
  return state.user.role === "ADMIN";
}

function extractId(pathname: string): number | null {
  const lastSegment = pathname.split("/").filter(Boolean).at(-1);
  const id = Number(lastSegment);

  return Number.isFinite(id) ? id : null;
}

function updateCartItem(state: MockApiState, itemId: number, quantity: number): Cart {
  const item = state.items.find((entry) => entry.id === itemId);

  if (!item) {
    return state.cart;
  }

  const existing = state.cart.cartItems.find((entry) => entry.item.id === itemId);

  if (existing) {
    existing.quantity = quantity;
  } else {
    state.cart.cartItems.push({
      item: clone(item),
      quantity
    });
  }

  state.cart.allPrice = cartTotal(state.cart);
  return state.cart;
}

function parseMultipartPayload(request: Request): {
  fields: Map<string, string>;
  filenames: Map<string, string>;
} {
  const contentType = request.headers()["content-type"] ?? "";
  const boundary = contentType.match(/boundary=(.+)$/)?.[1];
  const body = request.postDataBuffer()?.toString("utf8") ?? request.postData() ?? "";
  const fields = new Map<string, string>();
  const filenames = new Map<string, string>();

  if (!boundary || !body) {
    return {
      fields,
      filenames
    };
  }

  const parts = body.split(`--${boundary}`);

  for (const part of parts) {
    if (!part.includes("Content-Disposition")) {
      continue;
    }

    const nameMatch = part.match(/name="([^"]+)"/);

    if (!nameMatch) {
      continue;
    }

    const filenameMatch = part.match(/filename="([^"]*)"/);
    const valueMatch = part.match(/\r\n\r\n([\s\S]*?)\r\n$/);

    if (filenameMatch && filenameMatch[1]) {
      filenames.set(nameMatch[1], filenameMatch[1]);
    }

    if (valueMatch) {
      fields.set(nameMatch[1], valueMatch[1]);
    }
  }

  return {
    fields,
    filenames
  };
}

async function handleRequest(route: Route, state: MockApiState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();
  const bodyText = request.postData() ?? "";

  if (!(pathname === "/api" || pathname.startsWith("/api/"))) {
    await route.fallback();
    return;
  }

  if (method === "POST" && pathname === "/api/login") {
    const payload = JSON.parse(bodyText) as {
      email: string;
      password: string;
    };
    const found = state.credentials.get(payload.email);

    if (!found || found.password !== payload.password) {
      return unauthorized(route, "INVALID_CREDENTIALS", "로그인에 실패했습니다.");
    }

    state.user = clone(found.user);
    state.sessionMode = "authenticated";
    state.refreshAvailable = true;

    return json(route, 200, {
      accessTokenExpiresInSeconds: 300,
      user: clone(state.user)
    });
  }

  if (method === "POST" && pathname === "/api/register") {
    const payload = JSON.parse(bodyText) as {
      name: string;
      email: string;
      password: string;
    };
    const nextUser: User = {
      id: state.credentials.size + 1,
      email: payload.email,
      name: payload.name,
      role: "USER"
    };

    state.credentials.set(payload.email, {
      password: payload.password,
      user: nextUser
    });

    return json(route, 201, nextUser);
  }

  if (method === "POST" && pathname === "/api/auth/refresh") {
    if (state.nextRefreshFailure) {
      const nextFailure = state.nextRefreshFailure;
      state.nextRefreshFailure = null;
      return unauthorized(route, nextFailure.code, nextFailure.message);
    }

    if (!state.refreshAvailable) {
      return unauthorized(route, "REFRESH_TOKEN_REQUIRED", "리프레시 토큰이 필요합니다.");
    }

    state.refreshCount += 1;
    state.sessionMode = "authenticated";
    return noContent(route);
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    state.sessionMode = "guest";
    state.refreshAvailable = false;
    state.cart = {
      cartItems: [],
      allPrice: 0
    };
    return noContent(route);
  }

  if (pathname.startsWith("/api/") || pathname === "/api") {
    const isPublicRequest =
      (method === "GET" && pathname.startsWith("/api/items")) ||
      (method === "GET" && pathname.startsWith("/api/categories")) ||
      (method === "GET" && pathname.startsWith("/api/posts")) ||
      (method === "POST" &&
        ["/api/login", "/api/register", "/api/auth/refresh", "/api/auth/logout"].includes(
          pathname
        ));

    if (!isPublicRequest && !canAccessProtectedApi(state)) {
      return unauthorized(route);
    }
  }

  if (
    ["/api/items", "/api/categories"].includes(pathname) &&
    method !== "GET" &&
    !isAdmin(state)
  ) {
    return forbidden(route, "관리자 권한이 필요합니다.");
  }

  if (
    /^\/api\/items\/\d+$/.test(pathname) &&
    ["PUT", "DELETE"].includes(method) &&
    !isAdmin(state)
  ) {
    return forbidden(route, "관리자 권한이 필요합니다.");
  }

  if (method === "GET" && pathname === "/api") {
    return json(route, 200, {
      userDto: clone(state.user),
      itemDto: clone(state.items)
    });
  }

  if (method === "GET" && pathname === "/api/items") {
    const keyword = url.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
    const categoryIdText = url.searchParams.get("categoryId");
    const categoryId =
      categoryIdText === null || categoryIdText === "" ? null : Number(categoryIdText);

    const filteredItems = state.items.filter((item) => {
      const matchesKeyword =
        !keyword || item.itemName.toLowerCase().includes(keyword);
      const matchesCategory =
        categoryId === null || item.categoryId === categoryId;

      return matchesKeyword && matchesCategory;
    });

    return json(route, 200, clone(filteredItems));
  }

  if (method === "POST" && pathname === "/api/items") {
    const payload = parseMultipartPayload(request);
    const categoryId = Number(payload.fields.get("categoryId"));
    const category = state.categories.find((entry) => entry.id === categoryId);

    if (!category) {
      return badRequest(route, "유효한 카테고리를 선택해 주세요.");
    }

    if (!payload.filenames.get("imageFile")) {
      return badRequest(route, "상품 이미지를 선택해 주세요.");
    }

    const nextItem: Item = {
      id: (state.items.at(-1)?.id ?? 0) + 1,
      itemName: payload.fields.get("itemName") ?? "새 상품",
      price: Number(payload.fields.get("price") ?? 0),
      quantity: Number(payload.fields.get("quantity") ?? 0),
      categoryId: category.id,
      categoryName: category.name,
      imageUrl: `/image/mock-item-${Date.now()}.webp`
    };

    state.items.unshift(nextItem);
    syncCategoryMetadata(state);

    return json(route, 201, clone(nextItem));
  }

  if (method === "GET" && pathname.startsWith("/api/items/")) {
    const itemId = extractId(pathname);
    const item = state.items.find((entry) => entry.id === itemId);

    return item ? json(route, 200, clone(item)) : notFound(route, "상품을 찾을 수 없습니다.");
  }

  if (method === "PUT" && /^\/api\/items\/\d+$/.test(pathname)) {
    const itemId = extractId(pathname);
    const item = state.items.find((entry) => entry.id === itemId);

    if (!item) {
      return notFound(route, "상품을 찾을 수 없습니다.");
    }

    const payload = parseMultipartPayload(request);
    const categoryId = Number(payload.fields.get("categoryId"));
    const category = state.categories.find((entry) => entry.id === categoryId);

    if (!category) {
      return badRequest(route, "유효한 카테고리를 선택해 주세요.");
    }

    item.itemName = payload.fields.get("itemName") ?? item.itemName;
    item.price = Number(payload.fields.get("price") ?? item.price);
    item.quantity = Number(payload.fields.get("quantity") ?? item.quantity);
    item.categoryId = category.id;
    item.categoryName = category.name;

    if (payload.filenames.get("imageFile")) {
      item.imageUrl = `/image/mock-item-${item.id}-updated.webp`;
    }

    syncCategoryMetadata(state);

    return json(route, 200, clone(item));
  }

  if (method === "DELETE" && /^\/api\/items\/\d+$/.test(pathname)) {
    const itemId = extractId(pathname);
    const index = state.items.findIndex((entry) => entry.id === itemId);

    if (index < 0) {
      return notFound(route, "상품을 찾을 수 없습니다.");
    }

    state.items.splice(index, 1);
    syncCategoryMetadata(state);

    return noContent(route);
  }

  if (method === "GET" && pathname === "/api/categories") {
    return json(route, 200, clone(state.categories));
  }

  if (method === "GET" && pathname === "/api/posts") {
    return json(route, 200, clone(state.posts));
  }

  if (method === "GET" && /^\/api\/posts\/\d+$/.test(pathname)) {
    const postId = extractId(pathname);
    const post = state.posts.find((entry) => entry.id === postId);

    return post ? json(route, 200, clone(post)) : notFound(route, "게시글을 찾을 수 없습니다.");
  }

  if (method === "POST" && pathname === "/api/posts") {
    const payload = JSON.parse(bodyText) as {
      title: string;
      content: string;
    };
    const nextPost: Post = {
      id: state.posts.length + 1,
      title: payload.title,
      content: payload.content,
      author: state.user.name,
      createdDate: new Date().toISOString(),
      comments: []
    };
    state.posts.unshift(nextPost);
    return json(route, 201, clone(nextPost));
  }

  if (method === "PUT" && /^\/api\/posts\/\d+$/.test(pathname)) {
    const postId = extractId(pathname);
    const post = state.posts.find((entry) => entry.id === postId);

    if (!post) {
      return notFound(route, "게시글을 찾을 수 없습니다.");
    }

    if (post.author !== state.user.name) {
      return forbidden(route, "게시물 작성자만 수정할 수 있습니다.");
    }

    const payload = JSON.parse(bodyText) as {
      title: string;
      content: string;
    };

    post.title = payload.title;
    post.content = payload.content;

    return json(route, 200, clone(post));
  }

  if (method === "DELETE" && /^\/api\/posts\/\d+$/.test(pathname)) {
    const postId = extractId(pathname);
    const index = state.posts.findIndex((entry) => entry.id === postId);

    if (index < 0) {
      return notFound(route, "게시글을 찾을 수 없습니다.");
    }

    if (state.posts[index].author !== state.user.name) {
      return forbidden(route, "게시물 작성자만 삭제할 수 있습니다.");
    }

    state.posts.splice(index, 1);
    return noContent(route);
  }

  if (method === "POST" && /^\/api\/posts\/\d+\/comments$/.test(pathname)) {
    const postId = Number(pathname.split("/")[3]);
    const post = state.posts.find((entry) => entry.id === postId);

    if (!post) {
      return notFound(route, "게시글을 찾을 수 없습니다.");
    }

    const form = new URLSearchParams(bodyText);
    const nextComment: Comment = {
      id: (post.comments.at(-1)?.id ?? 0) + 1,
      content: form.get("reply_content") ?? "",
      username: state.user.name,
      createdDate: new Date().toISOString()
    };
    post.comments.push(nextComment);
    return json(route, 201, clone(nextComment));
  }

  if (method === "PUT" && /^\/api\/posts\/\d+\/comments\/\d+$/.test(pathname)) {
    const [, , , postIdText, , commentIdText] = pathname.split("/");
    const postId = Number(postIdText);
    const commentId = Number(commentIdText);
    const post = state.posts.find((entry) => entry.id === postId);

    if (!post) {
      return notFound(route, "게시글을 찾을 수 없습니다.");
    }

    const comment = post.comments.find((entry) => entry.id === commentId);

    if (!comment) {
      return notFound(route, "댓글을 찾을 수 없습니다.");
    }

    if (comment.username !== state.user.name) {
      return forbidden(route, "댓글 작성자만 수정할 수 있습니다.");
    }

    const form = new URLSearchParams(bodyText);
    comment.content = form.get("reply_content") ?? comment.content;
    return json(route, 200, clone(comment));
  }

  if (method === "DELETE" && /^\/api\/posts\/\d+\/comments\/\d+$/.test(pathname)) {
    const [, , , postIdText, , commentIdText] = pathname.split("/");
    const postId = Number(postIdText);
    const commentId = Number(commentIdText);
    const post = state.posts.find((entry) => entry.id === postId);

    if (!post) {
      return notFound(route, "게시글을 찾을 수 없습니다.");
    }

    const index = post.comments.findIndex((entry) => entry.id === commentId);

    if (index < 0) {
      return notFound(route, "댓글을 찾을 수 없습니다.");
    }

    if (post.comments[index].username !== state.user.name) {
      return forbidden(route, "댓글 작성자만 삭제할 수 있습니다.");
    }

    post.comments.splice(index, 1);
    return noContent(route);
  }

  if (method === "GET" && pathname === "/api/cart") {
    return json(route, 200, clone(state.cart));
  }

  if (method === "POST" && /^\/api\/cart\/items\/\d+$/.test(pathname)) {
    const itemId = extractId(pathname);
    const payload = JSON.parse(bodyText) as {
      quantity: number;
    };
    updateCartItem(state, itemId ?? 0, payload.quantity);
    return json(route, 200, clone(state.cart));
  }

  if (method === "DELETE" && /^\/api\/cart\/items\/\d+$/.test(pathname)) {
    const itemId = extractId(pathname);
    state.cart.cartItems = state.cart.cartItems.filter((entry) => entry.item.id !== itemId);
    state.cart.allPrice = cartTotal(state.cart);
    return json(route, 200, clone(state.cart));
  }

  if (method === "POST" && pathname === "/api/orders") {
    const nextOrder: Order = {
      id: state.orders.length + 1,
      orderDate: new Date().toISOString(),
      status: "ORDERED",
      orderItems: state.cart.cartItems.map((entry) => ({
        itemName: entry.item.itemName,
        price: entry.item.price,
        quantity: entry.quantity
      }))
    };
    state.orders.unshift(nextOrder);
    state.cart = {
      cartItems: [],
      allPrice: 0
    };
    return json(route, 200, clone(nextOrder));
  }

  if (method === "DELETE" && /^\/api\/orders\/\d+$/.test(pathname)) {
    const orderId = extractId(pathname);
    const order = state.orders.find((entry) => entry.id === orderId);

    if (!order) {
      return notFound(route, "주문을 찾을 수 없습니다.");
    }

    order.status = "CANCELLED";
    return json(route, 200, clone(order));
  }

  if (method === "GET" && pathname === "/api/myPage") {
    return json(route, 200, buildMyPage(state));
  }

  if (method === "PUT" && pathname === "/api/users") {
    const previousName = state.user.name;
    const previousEmail = state.user.email;
    const payload = JSON.parse(bodyText) as {
      name: string;
      email: string;
    };

    state.user = {
      ...state.user,
      name: payload.name,
      email: payload.email
    };

    const stored = state.credentials.get(previousEmail);

    if (stored) {
      state.credentials.delete(previousEmail);
      state.credentials.set(payload.email, {
        ...stored,
        user: clone(state.user)
      });
    }

    for (const post of state.posts) {
      if (post.author === previousName) {
        post.author = state.user.name;
      }

      for (const comment of post.comments) {
        if (comment.username === previousName) {
          comment.username = state.user.name;
        }
      }
    }

    return json(route, 200, clone(state.user));
  }

  return notFound(route, `처리하지 않은 mock API 경로입니다: ${method} ${pathname}`);
}

export async function installMockApi(
  page: Page,
  options: MockApiOptions = {}
): Promise<MockApiControls> {
  const state = createInitialState(options);

  await page.route("**/*", async (route) => {
    await handleRequest(route, state);
  });

  return {
    expireAccess() {
      if (state.refreshAvailable) {
        state.sessionMode = "expired";
      }
    },
    failNextRefresh(
      code = "INVALID_REFRESH_TOKEN",
      message = "리프레시 토큰이 유효하지 않습니다."
    ) {
      state.nextRefreshFailure = {
        code,
        message
      };
    },
    getRefreshCount() {
      return state.refreshCount;
    },
    getState() {
      return {
        cart: clone(state.cart),
        orders: clone(state.orders),
        posts: clone(state.posts),
        user: clone(state.user),
        items: clone(state.items)
      };
    }
  };
}
