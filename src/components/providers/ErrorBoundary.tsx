import React from "react";

type ErrorBoundaryState = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console so we can inspect via Lovable logs
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    // Try a clean reload (also helpful if caches were stale)
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border bg-card text-card-foreground shadow-lg p-6 space-y-4">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm opacity-80">An unexpected error occurred. Try reloading the page.</p>
            <button onClick={this.handleReload} className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm transition-colors hover:bg-accent">
              Reload
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-2 max-h-56 overflow-auto text-xs opacity-70">
                {String(this.state.error?.stack || this.state.error?.message)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
