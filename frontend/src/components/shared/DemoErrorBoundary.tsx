import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";

interface DemoErrorBoundaryProps {
  children: ReactNode;
  onReturnToLanding: () => void;
}

interface DemoErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

export class DemoErrorBoundary extends Component<
  DemoErrorBoundaryProps,
  DemoErrorBoundaryState
> {
  constructor(props: DemoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): Partial<DemoErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("DemoErrorBoundary caught error:", error, info);
  }

  handleRetry = (): void => {
    if (this.state.retryCount >= 1) {
      // Second failure — navigate back to landing
      this.props.onReturnToLanding();
      return;
    }
    this.setState((prev) => ({
      hasError: false,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-surface-base">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-4 p-8 rounded-lg bg-surface-raised border border-border-subtle text-center max-w-md"
          >
            <p className="text-text-primary text-subheading">
              Unable to load demo data
            </p>
            <p className="text-text-secondary text-caption">
              {this.state.retryCount === 0
                ? "Something went wrong loading the demo. You can try again."
                : "Still unable to load. Returning to the home screen."}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 rounded-md bg-decision-drill-base text-text-inverse text-body font-medium transition-colors duration-fast hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-focus"
            >
              {this.state.retryCount === 0 ? "Retry" : "Back to Home"}
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
