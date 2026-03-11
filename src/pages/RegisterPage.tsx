import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { register, toAppErrorMessage } from "../api/client";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { sanitizeReturnTo } from "../lib/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, refreshSession, user } = useSession();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  if (user) {
    return <Navigate to={returnTo ?? "/account"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await register(form);
      await login(form.email, form.password);
      await refreshSession();
      navigate(returnTo ?? "/account", { replace: true });
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "회원가입에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">REGISTER</p>
        <h1>새 계정 만들기</h1>
        <p>
          백엔드 `RegisterForm` 규칙에 맞춰 이름, 이메일, 비밀번호를 등록한 뒤
          바로 로그인합니다.
        </p>

        <StatusBanner tone="error">{feedback}</StatusBanner>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            이름
            <input
              type="text"
              minLength={1}
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label>
            이메일
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              minLength={3}
              maxLength={15}
              required
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="auth-switch">
          이미 계정이 있으신가요?{" "}
          <Link to={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}>
            로그인
          </Link>
        </p>
      </div>
    </section>
  );
}
