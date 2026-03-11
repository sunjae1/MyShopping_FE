import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <EmptyState
        eyebrow="404"
        title="요청하신 페이지를 찾을 수 없습니다."
        description="라우트가 없거나 주소가 잘못되었습니다. 홈 화면으로 돌아가 주세요."
      />
      <div className="inline-actions">
        <Link to="/" className="primary-button link-button">
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
