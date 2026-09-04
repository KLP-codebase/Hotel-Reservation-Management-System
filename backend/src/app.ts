import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import staffRoutes from './routes/staff.routes';
import branchRoutes from './routes/branches.routes';
import guestRoutes from './routes/guests.routes';
import roomTypeRoutes from './routes/room-types.routes';

// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// Each middleware added here is a node in the chain.
// Order matters: global middleware first, routes second, error handler last.

const app = express();

// ── Global chain: CORS → JSON → routes → error (terminal) ─────────────────────
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));


// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Route mounting ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/guests', guestRoutes);
app.use('/api/v1/room-types', roomTypeRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// ── Terminal Chain handler (must have 4 params) ────────────────────────────────
app.use(errorHandler);

export default app;
