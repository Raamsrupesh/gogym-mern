export default function errorHandler(err, req, res, _next) {
  console.error('[ERR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Server error' : err.message });
};