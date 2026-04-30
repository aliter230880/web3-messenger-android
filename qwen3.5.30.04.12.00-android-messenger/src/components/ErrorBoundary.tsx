import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Что-то пошло не так
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {this.state.error?.message || 'Произошла непредвиденная ошибка'}
            </p>
            
            <button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#3390ec] hover:bg-[#2b7ecc] text-white font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Перезагрузить
            </button>
            
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-500">
                  Показать детали ошибки
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-slate-900 rounded-lg text-xs text-red-500 overflow-auto max-h-48">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
