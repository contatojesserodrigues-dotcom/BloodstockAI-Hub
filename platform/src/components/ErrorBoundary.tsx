import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; variant?: "page" | "inline"; resetKey?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const inline = this.props.variant === "inline";
      return (
        <div className={inline
          ? "min-h-[280px] flex flex-col items-center justify-center gap-4 px-6 py-12 bg-background text-center rounded-xl border border-border"
          : "min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 bg-background text-center"}>
          <p className="text-lg font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-md">
            {inline
              ? "This module failed to load. Try again or switch to another dashboard section."
              : "The page failed to load. Try refreshing — if the problem continues, sign in again from the home page."}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
            {!inline && (
              <Button variant="outline" onClick={() => { window.location.href = "/"; }}>Go Home</Button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
