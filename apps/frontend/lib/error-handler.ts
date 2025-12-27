/**
 * Error Handler Utility
 *
 * Centralized error handling for API errors and application errors.
 * Provides consistent error message formatting and error type detection.
 */

export interface ApiError {
  code?: string
  message: string
  statusCode?: number
}

export type ErrorType = 'network' | 'validation' | 'permission' | 'not-found' | 'server' | 'unknown'

/**
 * Extract error message from various error formats
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    // API error format: { success: false, error: { code, message } }
    if ('error' in error && typeof error.error === 'object' && error.error !== null) {
      const apiError = error.error as { message?: string; code?: string }
      if (apiError.message) {
        return apiError.message
      }
    }

    // Direct error object: { message: string }
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }

  return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
}

/**
 * Detect error type from error object or message
 */
export function detectErrorType(error: unknown, statusCode?: number): ErrorType {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'network'
  }

  // HTTP status code based detection
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return 'permission'
    }
    if (statusCode === 404) {
      return 'not-found'
    }
    if (statusCode >= 500) {
      return 'server'
    }
    if (statusCode === 400 || statusCode === 422) {
      return 'validation'
    }
  }

  // Error code based detection
  if (typeof error === 'object' && error !== null) {
    if ('error' in error && typeof error.error === 'object' && error.error !== null) {
      const apiError = error.error as { code?: string }
      if (apiError.code) {
        if (apiError.code.includes('AUTH') || apiError.code.includes('PERMISSION')) {
          return 'permission'
        }
        if (apiError.code.includes('NOT_FOUND')) {
          return 'not-found'
        }
        if (apiError.code.includes('VALIDATION')) {
          return 'validation'
        }
      }
    }
  }

  return 'unknown'
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: unknown, errorType: ErrorType): string {
  const baseMessage = extractErrorMessage(error)

  // If we already have a good message, use it
  if (baseMessage && baseMessage !== 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.') {
    return baseMessage
  }

  // Provide context-specific messages
  switch (errorType) {
    case 'network':
      return 'يبدو أن هناك مشكلة في الاتصال. يرجى التأكد من الإنترنت والمحاولة مرة أخرى.'
    case 'permission':
      return 'عذراً، هذا الإجراء غير متاح لصلاحياتك الحالية.'
    case 'not-found':
      return 'لم نتمكن من العثور على البيانات المطلوبة.'
    case 'validation':
      return 'يرجى مراجعة البيانات المدخلة والتأكد من صحتها.'
    case 'server':
      return 'واجهنا مشكلة تقنية بسيطة. يرجى المحاولة مرة أخرى لاحقاً.'
    default:
      return 'حدث شيء غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
  }
}

/**
 * Handle API error response
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorData: unknown

  try {
    errorData = await response.json()
  } catch {
    // If response is not JSON, create a generic error
    errorData = {
      error: {
        message: `خطأ في الخادم (${response.status})`,
        code: `HTTP_${response.status}`,
      },
    }
  }

  const errorType = detectErrorType(errorData, response.status)
  const message = getUserFriendlyMessage(errorData, errorType)

  const error = new Error(message) as Error & { code?: string; statusCode?: number }

  if (typeof errorData === 'object' && errorData !== null) {
    if ('error' in errorData && typeof errorData.error === 'object' && errorData.error !== null) {
      const apiError = errorData.error as { code?: string }
      error.code = apiError.code
    }
  }

  error.statusCode = response.status

  throw error
}

/**
 * Wrap API call with error handling
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await apiCall()
  } catch (error) {
    // If error is already handled, re-throw it
    if (error instanceof Error && error.message) {
      throw error
    }

    // Otherwise, extract and format the error
    const errorType = detectErrorType(error)
    const message = getUserFriendlyMessage(error, errorType)

    const formattedError = new Error(message) as Error & { code?: string; context?: string }
    formattedError.context = context

    throw formattedError
  }
}

