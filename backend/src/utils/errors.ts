export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (message: string) => new ApiError(400, 'VALIDATION_ERROR', message);
export const unauthenticated = (message = 'Chưa xác thực') =>
  new ApiError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'Không có quyền truy cập') =>
  new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Không tìm thấy') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);
export const rateLimited = (message: string) => new ApiError(429, 'RATE_LIMITED', message);
export const internal = (message = 'Lỗi máy chủ') => new ApiError(500, 'INTERNAL_ERROR', message);
