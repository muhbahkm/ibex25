'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorMessage } from './ui/ErrorMessage'
import Icon from './Icon'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 *
 * Catches React errors in the component tree and displays a fallback UI.
 * Prevents the entire app from crashing due to unhandled errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // TODO: In production, log to error tracking service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <Icon name="error" className="text-red-600 text-2xl" />
              </div>
              <h2 className="text-section-title text-gray-900">حدث خطأ</h2>
            </div>

            <ErrorMessage
              message={
                this.state.error?.message ||
                'حدث خطأ غير متوقع. يرجى تحديث الصفحة أو المحاولة مرة أخرى.'
              }
              className="mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

