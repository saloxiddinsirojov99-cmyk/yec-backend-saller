/**
 * Standardized API Response Helpers
 * 
 * Provides consistent response format across all endpoints:
 * { success: boolean, data?: any, message?: string, error?: string }
 */

function success(res, data = null, message = 'Muvaffaqiyatli bajarildi.', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

function created(res, data = null, message = 'Muvaffaqiyatli yaratildi.') {
  return success(res, data, message, 201);
}

function badRequest(res, message = 'Noto\'g\'ri so\'rov.') {
  return res.status(400).json({
    success: false,
    message,
  });
}

function unauthorized(res, message = 'Tizimga kirish talab qilinadi.') {
  return res.status(401).json({
    success: false,
    message,
  });
}

function forbidden(res, message = 'Ushbu amal uchun huquqingiz yetarli emas.') {
  return res.status(403).json({
    success: false,
    message,
  });
}

function notFound(res, message = 'Resurs topilmadi.') {
  return res.status(404).json({
    success: false,
    message,
  });
}

function serverError(res, message = 'Ichki server xatoligi yuz berdi.') {
  return res.status(500).json({
    success: false,
    message,
  });
}

function handleControllerError(res, error, log) {
  const logFn = log || console;
  logFn.error('Controller error:', error?.message || error);
  
  if (process.env.NODE_ENV !== 'production') {
    return res.status(500).json({
      success: false,
      message: 'Ichki server xatoligi yuz berdi.',
      error: error?.message,
    });
  }
  
  return serverError(res);
}

module.exports = {
  success,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  handleControllerError,
};