export const generateResponse = (res, statusCode,status, message, data) => {
  res.status(statusCode).json({status, message, data });
};

