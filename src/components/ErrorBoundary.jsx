import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-slate-950 text-white overflow-auto">
          <h1 className="text-2xl font-bold mb-4 text-red-500">
            Something went wrong.
          </h1>
          <div className="bg-slate-900 p-4 rounded border border-slate-800 max-w-2xl w-full">
            <p className="font-mono text-sm text-red-300 mb-2">
              {this.state.error && this.state.error.toString()}
            </p>
            <pre className="font-mono text-xs text-slate-500 whitespace-pre-wrap">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
