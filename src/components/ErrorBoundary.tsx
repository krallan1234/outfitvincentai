import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
interface State { hasError: boolean; error?: unknown }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("Unhandled error in UI:", error, errorInfo);
  }

  private handleReload = () => {
    const reload = () => {
      (globalThis as any).location?.reload();
    };

    try {
      // Clear caches if available, then reload
      // @ts-ignore - caches is a global in browsers
      if (typeof caches !== "undefined") {
        // @ts-ignore
        caches
          .keys()
          // @ts-ignore
          .then((keys: string[]) => Promise.all(keys.map((k) => caches.delete(k))))
          .finally(reload);
      } else {
        reload();
      }
    } catch {
      reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-semibold">Något gick fel</h1>
            <p className="text-muted-foreground">Vi har fångat felet. Du kan försöka igen.</p>
            <Button onClick={this.handleReload}>Ladda om</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
