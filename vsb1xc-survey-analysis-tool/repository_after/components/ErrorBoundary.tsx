'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            {this.state.error && (
              <p className="text-sm text-gray-600 mb-4">
                {this.state.error.message}
              </p>
            )}
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
