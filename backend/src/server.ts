require('dotenv').config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db';
import { configureS3 } from './config/s3';
import authRoutes from './routes/auth.routes';
import contentRoutes from './routes/content.routes';
import uploadRoutes from './routes/upload.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// Trust the first proxy (Nginx) so rate limiters use the real client IP
app.set('trust proxy', 1);

// Configure AWS S3
configureS3();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable COOP — Google GSI uses window.postMessage between its iframe
  // and the parent page. The default 'same-origin' COOP header blocks that.
  crossOriginOpenerPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  "http://localhost:5173",
  "https://dtgv51v7rcwge.cloudfront.net",  // CloudFront frontend — NO trailing slash!
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like Postman / mobile apps)
    if (!origin) return callback(null, true);

    // allow chrome extensions (optional)
    if (origin.startsWith("chrome-extension://")) {
      return callback(null, true);
    }

    // allow whitelisted origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("CORS not allowed"));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID"
  ],

  exposedHeaders: [
    "X-Request-ID",
    "X-API-Version"
  ]
}));

// ── Request ID (attach unique ID to every request for tracing) ────────────────
app.use((req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  res.setHeader('X-API-Version', 'v1');
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload requests. Please try again in 15 minutes.' },
});

app.use(generalLimiter);

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Snappad API is running', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log('✨ Backend services (Database & Storage) are fully connected and active!');
  });
}).catch((err) => {
  console.error('Failed to connect to the database. Server failed to start.', err);
});

export default app;
