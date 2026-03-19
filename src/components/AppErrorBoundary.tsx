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
                <h1>페이지를 표시하는 중 잠시 문제가 생겼습니다.</h1>
                <p className="muted-copy">
                  잠시 후 다시 불러오면 대부분 바로 정상적으로 쇼핑을 이어갈 수 있습니다.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => window.location.reload()}
                >
                  다시 불러오기
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
