export default function errorHandler(err, req, res, _next) {
  const message = [
    typeof err === 'string' ? err : null,
    err?.message,
    err?.error?.description,
    err?.error?.message,
    err?.description,
  ].find((value) => typeof value === 'string' && value.trim());
  console.error('[ERR]', message || 'Unknown error', { status: err?.status || err?.statusCode, code: err?.code });
  if (err?.code === 11000) return res.status(409).json({ error: 'A record with this value already exists' });
  const status = err?.status || err?.statusCode || (
    err?.code === 'LIMIT_FILE_SIZE' ? 413
      : err?.code === 'LIMIT_UNEXPECTED_FILE' || message?.startsWith('Only JPEG') ? 400
        : err?.name === 'ValidationError' || err?.name === 'CastError' ? 400
        : 500
  );
  res.status(status).json({ error: status === 500 ? 'Server error' : message || 'Request failed' });
};