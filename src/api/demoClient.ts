import { dispatchAuthRequired } from "../lib/auth";
import { createDemoSeed, type DemoSeedOrder, type DemoSeedPost, type DemoStoreSeed } from "./demoSeed";
import type {
  Cart,
  CartItem,
  Category,
  Comment,
  Item,
  ItemMutationInput,
  MyPage,
  Order,
  Post,
  SessionPayload,
  User
} from "./types";

const DEMO_STORE_KEY = "shopping.demo.store";
const DEMO_SESSION_KEY = "shopping.demo.session";

interface DemoSessionState {
  userId: number | null;
}

export class DemoApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DemoApiError";
    this.status = status;
  }
}

type DemoStore = DemoStoreSeed;

let inMemoryDemoStore: DemoStore | null = null;
let inMemoryDemoSession: DemoSessionState = {
  userId: null
};

function cloneStore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadStore(): DemoStore {
  const storage = getStorage();
  const raw = storage?.getItem(DEMO_STORE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoStore;
      inMemoryDemoStore = cloneStore(parsed);
      return cloneStore(parsed);
    } catch {
      storage?.removeItem(DEMO_STORE_KEY);
    }
  }

  if (inMemoryDemoStore) {
    return cloneStore(inMemoryDemoStore);
  }

  const seed = createDemoSeed();
  inMemoryDemoStore = cloneStore(seed);
  storage?.setItem(DEMO_STORE_KEY, JSON.stringify(seed));

  return cloneStore(seed);
}

function saveStore(store: DemoStore): void {
  const snapshot = cloneStore(store);
  inMemoryDemoStore = snapshot;
  getStorage()?.setItem(DEMO_STORE_KEY, JSON.stringify(snapshot));
}

function getSessionUserId(): number | null {
  const storage = getStorage();
  const raw = storage?.getItem(DEMO_SESSION_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoSessionState;
      inMemoryDemoSession = parsed;
      return typeof parsed.userId === "number" ? parsed.userId : null;
    } catch {
      storage?.removeItem(DEMO_SESSION_KEY);
    }
  }

  return inMemoryDemoSession.userId;
}

function setSessionUserId(userId: number | null): void {
  inMemoryDemoSession = {
    userId
  };

  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (userId === null) {
    storage.removeItem(DEMO_SESSION_KEY);
    return;
  }

  storage.setItem(
    DEMO_SESSION_KEY,
    JSON.stringify({
      userId
    })
  );
}

function getNextId(store: DemoStore, key: keyof DemoStore["nextIds"]): number {
  const nextId = store.nextIds[key];
  store.nextIds[key] += 1;
  return nextId;
}

function getCurrentUser(store: DemoStore): DemoStore["users"][number] | null {
  const userId = getSessionUserId();

  if (userId === null) {
    return null;
  }

  return store.users.find((user) => user.id === userId) ?? null;
}

function ensureUser(authMessage = "로그인이 필요합니다."): {
  store: DemoStore;
  user: DemoStore["users"][number];
} {
  const store = loadStore();
  const user = getCurrentUser(store);

  if (!user) {
    dispatchAuthRequired({
      message: authMessage
    });
    throw new DemoApiError(401, authMessage);
  }

  return {
    store,
    user
  };
}

function ensureAdmin(): {
  store: DemoStore;
  user: DemoStore["users"][number];
} {
  const context = ensureUser("운영자 계정으로 로그인해 주세요.");

  if (context.user.role !== "ADMIN") {
    throw new DemoApiError(403, "운영자 권한이 필요합니다.");
  }

  return context;
}

function toPublicUser(user: DemoStore["users"][number]): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

function compareByNewest(left: { createdDate?: string; orderDate?: string }, right: { createdDate?: string; orderDate?: string }) {
  const leftValue = left.createdDate ?? left.orderDate ?? "";
  const rightValue = right.createdDate ?? right.orderDate ?? "";

  return rightValue.localeCompare(leftValue);
}

function getCategoryName(store: DemoStore, categoryId: number | null | undefined): string | null {
  if (typeof categoryId !== "number") {
    return null;
  }

  return store.categories.find((category) => category.id === categoryId)?.name ?? null;
}

function hydrateItem(store: DemoStore, item: Item): Item {
  return {
    ...item,
    categoryName: getCategoryName(store, item.categoryId),
    imageUrl: item.imageUrl ?? null
  };
}

function buildItems(store: DemoStore): Item[] {
  return store.items.map((item) => hydrateItem(store, item)).sort((left, right) => left.id - right.id);
}

function buildCategories(store: DemoStore): Category[] {
  return store.categories
    .map((category) => {
      const items = store.items.filter((item) => item.categoryId === category.id);

      return {
        id: category.id,
        name: category.name,
        representativeImageUrl: items[0]?.imageUrl ?? null,
        itemCount: items.length
      };
    })
    .sort((left, right) => left.id - right.id);
}

function toPublicOrder(order: DemoSeedOrder): Order {
  return {
    id: order.id,
    orderDate: order.orderDate,
    status: order.status,
    orderItems: order.lineItems.map((lineItem) => ({
      itemName: lineItem.itemName,
      price: lineItem.price,
      quantity: lineItem.quantity
    }))
  };
}

function toPublicPost(post: DemoSeedPost): Post {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.author,
    createdDate: post.createdDate,
    comments: post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      username: comment.username,
      createdDate: comment.createdDate
    }))
  };
}

function getCartEntries(store: DemoStore, userId: number) {
  return [...(store.carts[String(userId)] ?? [])];
}

function buildCart(store: DemoStore, userId: number): Cart {
  const cartItems = getCartEntries(store, userId)
    .map((entry) => {
      const item = store.items.find((candidate) => candidate.id === entry.itemId);

      if (!item) {
        return null;
      }

      return {
        item: hydrateItem(store, item),
        quantity: entry.quantity
      };
    })
    .filter((entry): entry is CartItem => entry !== null);

  return {
    cartItems,
    allPrice: cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };

    reader.onerror = () => {
      reject(new Error("이미지 파일을 읽지 못했습니다."));
    };

    reader.readAsDataURL(file);
  });
}

export async function fetchSessionDemo(): Promise<SessionPayload> {
  const store = loadStore();
  const user = getCurrentUser(store);

  return {
    user: user ? toPublicUser(user) : null,
    items: buildItems(store).slice(0, 4)
  };
}

export async function loginDemo(email: string, password: string): Promise<User> {
  const store = loadStore();
  const user = store.users.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.trim().toLowerCase() &&
      candidate.password === password
  );

  if (!user) {
    throw new DemoApiError(400, "이메일 또는 비밀번호를 다시 확인해 주세요.");
  }

  setSessionUserId(user.id);
  return toPublicUser(user);
}

export async function registerDemo(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const store = loadStore();
  const trimmedEmail = input.email.trim().toLowerCase();

  if (store.users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
    throw new DemoApiError(409, "이미 사용 중인 이메일입니다.");
  }

  const nextUser = {
    id: getNextId(store, "user"),
    name: input.name.trim(),
    email: trimmedEmail,
    password: input.password,
    role: "USER" as const
  };

  store.users.push(nextUser);
  store.carts[String(nextUser.id)] = [];
  saveStore(store);

  return toPublicUser(nextUser);
}

export async function logoutDemo(): Promise<void> {
  setSessionUserId(null);
}

export async function fetchItemsDemo(filters?: {
  keyword?: string;
  categoryId?: number | null;
}): Promise<Item[]> {
  const trimmedKeyword = filters?.keyword?.trim().toLowerCase() ?? "";
  const items = buildItems(loadStore());

  return items.filter((item) => {
    const matchesKeyword =
      !trimmedKeyword || item.itemName.toLowerCase().includes(trimmedKeyword);
    const matchesCategory =
      typeof filters?.categoryId !== "number" || item.categoryId === filters.categoryId;

    return matchesKeyword && matchesCategory;
  });
}

export async function fetchItemDemo(itemId: number): Promise<Item> {
  const store = loadStore();
  const item = store.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new DemoApiError(404, "상품을 찾을 수 없습니다.");
  }

  return hydrateItem(store, item);
}

export async function fetchCategoriesDemo(): Promise<Category[]> {
  return buildCategories(loadStore());
}

export async function createCategoryDemo(input: { name: string }): Promise<Category> {
  const { store } = ensureAdmin();
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new DemoApiError(400, "카테고리 이름을 입력해 주세요.");
  }

  if (store.categories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase())) {
    throw new DemoApiError(409, "이미 같은 이름의 카테고리가 있습니다.");
  }

  const nextCategory = {
    id: getNextId(store, "category"),
    name: trimmedName
  };

  store.categories.push(nextCategory);
  saveStore(store);

  return buildCategories(store).find((category) => category.id === nextCategory.id)!;
}

export async function updateCategoryDemo(
  categoryId: number,
  input: { name: string }
): Promise<Category> {
  const { store } = ensureAdmin();
  const category = store.categories.find((entry) => entry.id === categoryId);

  if (!category) {
    throw new DemoApiError(404, "카테고리를 찾을 수 없습니다.");
  }

  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new DemoApiError(400, "카테고리 이름을 입력해 주세요.");
  }

  if (
    store.categories.some(
      (entry) =>
        entry.id !== categoryId &&
        entry.name.toLowerCase() === trimmedName.toLowerCase()
    )
  ) {
    throw new DemoApiError(409, "이미 같은 이름의 카테고리가 있습니다.");
  }

  category.name = trimmedName;
  store.items = store.items.map((item) =>
    item.categoryId === categoryId
      ? {
          ...item,
          categoryName: trimmedName
        }
      : item
  );
  saveStore(store);

  return buildCategories(store).find((entry) => entry.id === categoryId)!;
}

export async function deleteCategoryDemo(categoryId: number): Promise<void> {
  const { store } = ensureAdmin();

  if (store.items.some((item) => item.categoryId === categoryId)) {
    throw new DemoApiError(409, "이 카테고리에 등록된 상품이 있어 삭제할 수 없습니다.");
  }

  store.categories = store.categories.filter((category) => category.id !== categoryId);
  saveStore(store);
}

export async function createItemDemo(input: ItemMutationInput): Promise<Item> {
  const { store } = ensureAdmin();
  const categoryName = getCategoryName(store, input.categoryId);

  if (!categoryName) {
    throw new DemoApiError(404, "카테고리를 찾을 수 없습니다.");
  }

  if (!input.imageFile) {
    throw new DemoApiError(400, "상품 이미지를 준비해 주세요.");
  }

  const nextItem: Item = {
    id: getNextId(store, "item"),
    itemName: input.itemName.trim(),
    price: input.price,
    quantity: input.quantity,
    categoryId: input.categoryId,
    categoryName,
    imageUrl: await fileToDataUrl(input.imageFile)
  };

  store.items = [nextItem, ...store.items];
  saveStore(store);

  return hydrateItem(store, nextItem);
}

export async function updateItemDemo(itemId: number, input: ItemMutationInput): Promise<Item> {
  const { store } = ensureAdmin();
  const item = store.items.find((entry) => entry.id === itemId);

  if (!item) {
    throw new DemoApiError(404, "상품을 찾을 수 없습니다.");
  }

  const categoryName = getCategoryName(store, input.categoryId);

  if (!categoryName) {
    throw new DemoApiError(404, "카테고리를 찾을 수 없습니다.");
  }

  item.itemName = input.itemName.trim();
  item.price = input.price;
  item.quantity = input.quantity;
  item.categoryId = input.categoryId;
  item.categoryName = categoryName;

  if (input.imageFile) {
    item.imageUrl = await fileToDataUrl(input.imageFile);
  }

  saveStore(store);

  return hydrateItem(store, item);
}

export async function deleteItemDemo(itemId: number): Promise<void> {
  const { store } = ensureAdmin();

  store.items = store.items.filter((item) => item.id !== itemId);

  for (const userId of Object.keys(store.carts)) {
    store.carts[userId] = (store.carts[userId] ?? []).filter((entry) => entry.itemId !== itemId);
  }

  saveStore(store);
}

export async function fetchCartDemo(): Promise<Cart> {
  const { store, user } = ensureUser();
  return buildCart(store, user.id);
}

export async function addToCartDemo(itemId: number, quantity: number): Promise<Cart> {
  const { store, user } = ensureUser();
  const item = store.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new DemoApiError(404, "상품을 찾을 수 없습니다.");
  }

  if (item.quantity <= 0) {
    throw new DemoApiError(409, "현재 품절된 상품입니다.");
  }

  const nextQuantity = Math.max(1, Math.floor(quantity));
  const cartEntries = store.carts[String(user.id)] ?? [];
  const existingEntry = cartEntries.find((entry) => entry.itemId === itemId);

  if (existingEntry) {
    existingEntry.quantity = Math.min(existingEntry.quantity + nextQuantity, item.quantity);
  } else {
    cartEntries.push({
      itemId,
      quantity: Math.min(nextQuantity, item.quantity)
    });
  }

  store.carts[String(user.id)] = cartEntries;
  saveStore(store);

  return buildCart(store, user.id);
}

export async function removeCartItemDemo(itemId: number): Promise<Cart> {
  const { store, user } = ensureUser();

  store.carts[String(user.id)] = (store.carts[String(user.id)] ?? []).filter(
    (entry) => entry.itemId !== itemId
  );
  saveStore(store);

  return buildCart(store, user.id);
}

export async function checkoutDemo(): Promise<Order> {
  const { store, user } = ensureUser();
  const cartEntries = store.carts[String(user.id)] ?? [];

  if (cartEntries.length === 0) {
    throw new DemoApiError(400, "장바구니가 비어 있습니다.");
  }

  const lineItems = cartEntries.map((entry) => {
    const item = store.items.find((candidate) => candidate.id === entry.itemId);

    if (!item) {
      throw new DemoApiError(404, "장바구니 상품을 찾을 수 없습니다.");
    }

    if (item.quantity < entry.quantity) {
      throw new DemoApiError(409, `${item.itemName} 상품의 재고가 부족합니다.`);
    }

    return {
      itemId: item.id,
      itemName: item.itemName,
      price: item.price,
      quantity: entry.quantity
    };
  });

  for (const lineItem of lineItems) {
    const item = store.items.find((candidate) => candidate.id === lineItem.itemId);

    if (item) {
      item.quantity -= lineItem.quantity;
    }
  }

  const nextOrder: DemoSeedOrder = {
    id: getNextId(store, "order"),
    userId: user.id,
    orderDate: new Date().toISOString(),
    status: "PAID",
    lineItems
  };

  store.orders = [nextOrder, ...store.orders];
  store.carts[String(user.id)] = [];
  saveStore(store);

  return toPublicOrder(nextOrder);
}

export async function cancelOrderDemo(orderId: number): Promise<Order> {
  const { store, user } = ensureUser();
  const order = store.orders.find((entry) => entry.id === orderId && entry.userId === user.id);

  if (!order) {
    throw new DemoApiError(404, "주문을 찾을 수 없습니다.");
  }

  if (order.status !== "CANCELLED") {
    order.status = "CANCELLED";

    for (const lineItem of order.lineItems) {
      const item = store.items.find((candidate) => candidate.id === lineItem.itemId);

      if (item) {
        item.quantity += lineItem.quantity;
      }
    }

    saveStore(store);
  }

  return toPublicOrder(order);
}

export async function fetchMyPageDemo(): Promise<MyPage> {
  const { store, user } = ensureUser();

  return {
    user: toPublicUser(user),
    orders: store.orders
      .filter((order) => order.userId === user.id)
      .sort(compareByNewest)
      .map((order) => toPublicOrder(order)),
    posts: store.posts
      .filter((post) => post.authorId === user.id)
      .sort(compareByNewest)
      .map((post) => toPublicPost(post)),
    cartItems: getCartEntries(store, user.id)
      .map((entry) => store.items.find((item) => item.id === entry.itemId))
      .filter((item): item is Item => item !== undefined)
      .map((item) => hydrateItem(store, item))
  };
}

export async function updateProfileDemo(input: {
  name: string;
  email: string;
}): Promise<User> {
  const { store, user } = ensureUser();
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();

  if (
    store.users.some(
      (entry) => entry.id !== user.id && entry.email.toLowerCase() === trimmedEmail
    )
  ) {
    throw new DemoApiError(409, "이미 사용 중인 이메일입니다.");
  }

  user.name = trimmedName;
  user.email = trimmedEmail;

  store.posts = store.posts.map((post) => ({
    ...post,
    author: post.authorId === user.id ? trimmedName : post.author,
    comments: post.comments.map((comment) =>
      comment.userId === user.id
        ? {
            ...comment,
            username: trimmedName
          }
        : comment
    )
  }));

  saveStore(store);

  return toPublicUser(user);
}

export async function fetchPostsDemo(): Promise<Post[]> {
  return loadStore().posts.sort(compareByNewest).map((post) => toPublicPost(post));
}

export async function fetchPostDemo(postId: number): Promise<Post> {
  const post = loadStore().posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  return toPublicPost(post);
}

export async function createPostDemo(input: {
  title: string;
  content: string;
}): Promise<Post> {
  const { store, user } = ensureUser();

  const nextPost: DemoSeedPost = {
    id: getNextId(store, "post"),
    authorId: user.id,
    author: user.name,
    title: input.title.trim(),
    content: input.content.trim(),
    createdDate: new Date().toISOString(),
    comments: []
  };

  store.posts = [nextPost, ...store.posts];
  saveStore(store);

  return toPublicPost(nextPost);
}

export async function updatePostDemo(
  postId: number,
  input: { title: string; content: string }
): Promise<Post> {
  const { store, user } = ensureUser();
  const post = store.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  if (post.authorId !== user.id) {
    throw new DemoApiError(403, "내가 작성한 게시글만 수정할 수 있습니다.");
  }

  post.title = input.title.trim();
  post.content = input.content.trim();
  saveStore(store);

  return toPublicPost(post);
}

export async function deletePostDemo(postId: number): Promise<void> {
  const { store, user } = ensureUser();
  const post = store.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  if (post.authorId !== user.id) {
    throw new DemoApiError(403, "내가 작성한 게시글만 삭제할 수 있습니다.");
  }

  store.posts = store.posts.filter((entry) => entry.id !== postId);
  saveStore(store);
}

export async function createCommentDemo(postId: number, content: string): Promise<Comment> {
  const { store, user } = ensureUser();
  const post = store.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  const nextComment = {
    id: getNextId(store, "comment"),
    userId: user.id,
    username: user.name,
    content: content.trim(),
    createdDate: new Date().toISOString()
  };

  post.comments = [...post.comments, nextComment];
  saveStore(store);

  return {
    id: nextComment.id,
    content: nextComment.content,
    username: nextComment.username,
    createdDate: nextComment.createdDate
  };
}

export async function updateCommentDemo(
  postId: number,
  commentId: number,
  content: string
): Promise<Comment> {
  const { store, user } = ensureUser();
  const post = store.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  const comment = post.comments.find((entry) => entry.id === commentId);

  if (!comment) {
    throw new DemoApiError(404, "댓글을 찾을 수 없습니다.");
  }

  if (comment.userId !== user.id) {
    throw new DemoApiError(403, "내가 작성한 댓글만 수정할 수 있습니다.");
  }

  comment.content = content.trim();
  saveStore(store);

  return {
    id: comment.id,
    content: comment.content,
    username: comment.username,
    createdDate: comment.createdDate
  };
}

export async function deleteCommentDemo(postId: number, commentId: number): Promise<void> {
  const { store, user } = ensureUser();
  const post = store.posts.find((entry) => entry.id === postId);

  if (!post) {
    throw new DemoApiError(404, "게시글을 찾을 수 없습니다.");
  }

  const comment = post.comments.find((entry) => entry.id === commentId);

  if (!comment) {
    throw new DemoApiError(404, "댓글을 찾을 수 없습니다.");
  }

  if (comment.userId !== user.id) {
    throw new DemoApiError(403, "내가 작성한 댓글만 삭제할 수 있습니다.");
  }

  post.comments = post.comments.filter((entry) => entry.id !== commentId);
  saveStore(store);
}

export function resetDemoClientState(): void {
  inMemoryDemoStore = null;
  inMemoryDemoSession = {
    userId: null
  };
  const storage = getStorage();
  storage?.removeItem(DEMO_STORE_KEY);
  storage?.removeItem(DEMO_SESSION_KEY);
}
