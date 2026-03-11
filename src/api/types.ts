export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Item {
  id: number;
  itemName: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface CartItem {
  item: Item;
  quantity: number;
}

export interface Cart {
  cartItems: CartItem[];
  allPrice: number;
}

export interface OrderItem {
  itemName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  orderItems: OrderItem[];
  orderDate: string;
  status: string;
}

export interface Comment {
  id: number;
  content: string;
  username: string;
  createdDate: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  comments: Comment[];
  createdDate: string;
}

export interface MyPage {
  user: User;
  orders: Order[];
  posts: Post[];
  cartItems: Item[];
}

export interface RawUserResponse {
  userDto: User;
  itemDto: Item[];
}

export interface SessionPayload {
  user: User | null;
  items: Item[];
}

export interface RawPost {
  id: number;
  title: string;
  content: string;
  author?: string;
  authorName?: string;
  comments: Comment[];
  createdDate: string;
}
