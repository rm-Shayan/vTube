import { ApiError } from "../Utils/ApiError.js";

export const ApiErrorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      errors: err.errors || []
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};
