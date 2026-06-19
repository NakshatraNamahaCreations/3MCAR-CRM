import { sendError } from '../utils/apiResponse.js';

/** 404 handler for unmatched routes. */
export const notFound = (req, res) => {
  sendError(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, statusCode: 404 });
};

/**
 * Central error handler. Normalizes Mongoose, JWT, and AppError instances
 * into the standard error response shape.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let error = err.details || {};

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    error = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for "${field}". It already exists.`;
    error = err.keyValue;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[error]', err.stack || err);
  }

  sendError(res, { message, error, statusCode });
};

export default errorHandler;
