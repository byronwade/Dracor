export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { data, error: null, success: true };
}

export function errorResponse<T = never>(error: string): ApiResponse<T> {
  return { data: null, error, success: false };
}
