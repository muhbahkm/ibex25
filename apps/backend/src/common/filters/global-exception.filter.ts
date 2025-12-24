import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let errorCode: string;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract message from exception response
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message =
          responseObj.message ||
          responseObj.error ||
          exception.message ||
          'An error occurred';
        // Handle array of messages (from validation)
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      } else {
        message = exception.message || 'An error occurred';
      }

      // Map HTTP status codes to error codes
      switch (status) {
        case HttpStatus.NOT_FOUND:
          errorCode = 'NOT_FOUND';
          break;
        case HttpStatus.BAD_REQUEST:
          errorCode = 'BAD_REQUEST';
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = 'UNAUTHORIZED';
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = 'FORBIDDEN';
          break;
        case HttpStatus.CONFLICT:
          errorCode = 'CONFLICT';
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          errorCode = 'VALIDATION_ERROR';
          break;
        default:
          errorCode = 'BAD_REQUEST';
      }
    } else {
      // Unknown error
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_ERROR';
      message =
        exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
      },
    };

    response.status(status).json(errorResponse);
  }
}

