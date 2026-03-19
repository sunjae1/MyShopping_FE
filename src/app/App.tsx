import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../components/RequireAuth";
import { CartProvider } from "../contexts/CartContext";
import { SessionProvider } from "../contexts/SessionContext";
import { AccountPage } from "../pages/AccountPage";
import { AdminItemsPage } from "../pages/AdminItemsPage";
import { CartPage } from "../pages/CartPage";
import { CommunityDetailPage } from "../pages/CommunityDetailPage";
import { CommunityPage } from "../pages/CommunityPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProductPage } from "../pages/ProductPage";
import { RegisterPage } from "../pages/RegisterPage";

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <CartProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="/products/:productId" element={<ProductPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route
                path="/community/:postId"
                element={<CommunityDetailPage />}
              />
              <Route element={<RequireAuth />}>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/account" element={<AccountPage />} />
              </Route>
              <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
                <Route path="/admin/items" element={<AdminItemsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
