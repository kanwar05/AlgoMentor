export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(", ");
  }
  if (error.code === 11000) {
    status = 409;
    message = "An account with that email already exists";
  }
  if (error.name === "CastError") {
    status = 400;
    message = "Invalid resource identifier";
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack })
  });
}
