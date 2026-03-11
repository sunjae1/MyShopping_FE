import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toAppErrorMessage } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { getAuthMessage, sanitizeReturnTo } from "../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, refreshSession, user } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bannerMessage, setBannerMessage] = useState<string | null>(
    (location.state as { authMessage?: string } | null)?.authMessage ??
      getAuthMessage(searchParams.get("reason"))
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  if (user) {
    return <Navigate to={returnTo ?? "/account"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setBannerMessage(null);
    setFieldError(null);

    try {
      await login(email, password);
      await refreshSession();
      navigate(returnTo ?? "/account", { replace: true });
    } catch (error) {
      const message = toAppErrorMessage(error, "로그인에 실패했습니다.");
      setBannerMessage(message);
      setFieldError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">LOGIN</p>
        <h1>세션 기반 로그인</h1>
        <p>
          이 화면은 Spring Security JSON 로그인 엔드포인트인 `/api/login`을 직접
          호출합니다.
        </p>

        <StatusBanner tone="error">{bannerMessage}</StatusBanner>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            이메일
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {fieldError ? <p className="field-hint field-hint-error">{fieldError}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="auth-switch">
          계정이 없으신가요?{" "}
          <Link to={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}>
            회원가입
          </Link>
        </p>
      </div>
    </section>
  );
}
