export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function humanizeField(field) {
  return String(field)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

export function duplicateKeyMessage(error) {
  const fields = Object.keys(error.keyPattern || error.keyValue || {});
  const modelName = error.model?.modelName || error.modelName;

  if (fields.includes("email")) return "An account with that email already exists";

  const fieldDescription = fields.length
    ? fields.map(humanizeField).join(" and ")
    : "unique value";
  const modelDescription = modelName ? ` ${humanizeField(modelName)}` : "";
  return `A${modelDescription} record with that ${fieldDescription} already exists`;
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
    message = duplicateKeyMessage(error);
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
