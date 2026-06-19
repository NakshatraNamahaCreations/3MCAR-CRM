/**
 * Consistent API response helpers.
 *
 * Success: { success: true, message, data }
 * Error:   { success: false, message, error }
 */

export const sendSuccess = (res, { message = 'Operation completed successfully', data = {}, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (res, { message = 'Something went wrong', error = {}, statusCode = 400 } = {}) => {
  return res.status(statusCode).json({ success: false, message, error });
};

/**
 * AppError — throw this from services/controllers for controlled, client-facing errors.
 * The error middleware turns it into the standard error response.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Wraps an async route handler so thrown errors flow to the error middleware
 * without try/catch boilerplate in every controller.
 */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
