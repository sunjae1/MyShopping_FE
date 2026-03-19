import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Unhandled render error", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <main className="page-frame">
            <div className="page-stack">
              <section className="surface-card">
                <p className="eyebrow">RECOVERY MODE</p>
                <h1>화면을 표시하는 중 문제가 발생했습니다.</h1>
                <p className="muted-copy">
                  잘못된 응답 데이터나 예기치 않은 렌더 오류가 있어도 전체 화면이 하얗게
                  사라지지 않도록 복구 화면을 표시했습니다.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => window.location.reload()}
                >
                  새로고침
                </button>
              </section>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
