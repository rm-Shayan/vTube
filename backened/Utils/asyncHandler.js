export const asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err); // error ko Express ke error middleware ko forward karega
    }
  };
};