import { ForeignKeyConstraintError } from 'sequelize';

class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
  }
}

function errorHandler(err, res) {
  const statusCode = err instanceof CustomError ? err.statusCode : err.status || 500;
  const errorMessage = err.message || 'Internal server error';
  const errorName = err.name || 'Error';

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint error. Make sure the references exist.',
      errorName: 'ForeignKeyConstraintError',
    });
  }
  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
    errorName,
  });
}

function errorHandlerCustom(res, message, statusCode) {
  return res.status(statusCode).json({
    success: false,
    message,
    errorName: 'CustomError',
  });
}

// eslint-disable-next-line no-unused-vars
function expressErrorHandler(err, req, res, next) {
  return errorHandler(err, res);
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}

export {
  CustomError, errorHandler, errorHandlerCustom, expressErrorHandler, notFoundHandler,
};
