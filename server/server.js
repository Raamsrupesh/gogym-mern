import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { redis } from './config/redis.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import planRoutes from './routes/plans.routes.js';
import memberRoutes from './routes/members.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import razorpayRoutes from './routes/razorpay.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leadRoutes from './routes/leads.routes.js';
import reminderRoutes from './routes/reminders.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import adminRoutes from './routes/admin.routes.js';
import featureRoutes from './routes/features.routes.js';
import { start as startReminderJob } from './jobs/reminders.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/features', featureRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use(errorHandler);

const port = process.env.PORT || 5000;
(async () => {
  await connectDB();
  await redis.ping().catch(() => console.warn('Redis not reachable — rate limiting and refresh tokens will fail'));
  startReminderJob();
  app.listen(port, () => console.log(`GoGym API listening on :${port}`));
})();
