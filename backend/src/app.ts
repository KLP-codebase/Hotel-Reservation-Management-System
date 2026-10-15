import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import staffRoutes from './routes/staff.routes';
import branchRoutes from './routes/branches.routes';
import guestRoutes from './routes/guests.routes';
import roomTypeRoutes from './routes/room-types.routes';
import roomRoutes from './routes/rooms.routes';
import availabilityRoutes from './routes/availability.routes';
import bookingRoutes from './routes/bookings.routes';
import bookingRoomRoutes from './routes/booking-rooms.routes';
import dashboardRoutes from './routes/dashboard.routes';
import auditRoutes from './routes/audit.routes';
import servicesRoutes from './routes/services.routes';
import invoicesRoutes from './routes/invoices.routes';
import taxRoutes from './routes/tax.routes';
import reportsRoutes from './routes/reports.routes';
import chatRoutes from './routes/chat.routes';
import contactRoutes from './routes/contact.routes';



// ── GoF: Chain of Responsibility ──────────────────────────────────────────────
// Each middleware added here is a node in the chain.
// Order matters: global middleware first, routes second, error handler last.

const app = express();

// ── Global chain: CORS → JSON → routes → error (terminal) ─────────────────────
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
}));

app.use(cookieParser());

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
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/booking-rooms', bookingRoomRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/contact', contactRoutes);

// ── Admin monitoring routes (RBAC: ADMINISTRATOR, MANAGER, DBA) ───────────────
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/tax-configurations', taxRoutes);
app.use('/api/v1/reports', reportsRoutes);


// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

// ── Terminal Chain handler (must have 4 params) ────────────────────────────────
app.use(errorHandler);

export default app;
