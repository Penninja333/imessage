import React, { Component } from "react";
import { useChatStore } from "../../store/useChatStore";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught error]", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReturnToChats = () => {
    try {
      useChatStore.getState().setActiveConversationId(null);
    } catch {}
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-background px-6 py-12 text-center text-foreground">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border/80 bg-surface/60 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-2xl text-warning shadow-inner">
              ⚠️
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-tight sm:text-2xl">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>
            <p className="mb-6 text-sm text-muted">
              {this.state.error?.message ||
                "An unexpected display error occurred while rendering this view."}
            </p>
            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleReturnToChats}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:brightness-110 active:scale-95 sm:w-auto"
              >
                Return to Chats
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-elevated active:scale-95 sm:w-auto"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
