import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <EmptyState
        eyebrow="404"
        title="찾으시는 페이지가 보이지 않습니다."
        description="주소가 변경되었거나 준비되지 않은 페이지입니다. 메인으로 돌아가 계속 둘러보세요."
      />
      <div className="inline-actions">
        <Link to="/" className="primary-button link-button">
          메인으로 이동
        </Link>
      </div>
    </div>
  );
}
