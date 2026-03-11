import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import {
  addToCart as apiAddToCart,
  checkout as apiCheckout,
  fetchCart,
  removeCartItem as apiRemoveCartItem
} from "../api/client";
import type { Cart, Order } from "../api/types";
import { useSession } from "./SessionContext";

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  checkout: () => Promise<Order>;
}

const emptyCart: Cart = {
  cartItems: [],
  allPrice: 0
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loading, setLoading] = useState(false);

  async function refreshCart() {
    if (!user) {
      setCart(emptyCart);
      return;
    }

    setLoading(true);

    try {
      setCart(await fetchCart());
    } finally {
      setLoading(false);
    }
  }

  async function addItem(itemId: number, quantity: number) {
    const updatedCart = await apiAddToCart(itemId, quantity);
    setCart(updatedCart);
  }

  async function removeItem(itemId: number) {
    const updatedCart = await apiRemoveCartItem(itemId);
    setCart(updatedCart);
  }

  async function checkout() {
    const order = await apiCheckout();
    await refreshCart();
    return order;
  }

  useEffect(() => {
    void refreshCart();
  }, [user?.id]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        refreshCart,
        addItem,
        removeItem,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
