export default function handler(req, res) {
  res.status(404).json({ error: 'API routes are not supported in static exports' });
} 