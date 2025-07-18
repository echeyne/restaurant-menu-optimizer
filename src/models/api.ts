/**
 * Common API response models
 */

export interface ApiResponse<T> {
  statusCode: number;
  headers: {
    [key: string]: string | boolean;
  };
  body: string;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Helper function to create a standardized API response
 */
export function createResponse<T>(statusCode: number, body: T): ApiResponse<T> {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
  details?: any
): ApiResponse<ErrorResponse> {
  return createResponse(statusCode, {
    message,
    code,
    details,
  });
}
