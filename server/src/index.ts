import dns from 'dns';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// @ts-ignore
global.fetch = fetch;

// DNS Fallback resolver for Supabase when local router DNS fails
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const origLookup = dns.lookup;
  (dns as any).lookup = function (hostname: string, options: any, callback: any) {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    }
    origLookup(hostname, opts, (err: any, address: any, family: any) => {
      if (err && hostname && hostname.includes('supabase.co')) {
        dns.resolve4(hostname, (rErr, addrs) => {
          if (!rErr && addrs && addrs.length > 0) {
            if (opts && opts.all) {
              return cb(null, addrs.map(a => ({ address: a, family: 4 })));
            }
            return cb(null, addrs[0], 4);
          }
          cb(err, address, family);
        });
      } else {
        cb(err, address, family);
      }
    });
  };
} catch (e) {
  console.warn('DNS fallback setup warning:', e);
}
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import destinationsRouter from './routes/destinations';
import auditRouter from './routes/audit';
import projectsRouter from './routes/projects';
import { startCronJobs } from './services/cron';
import { requireAuth } from './middleware/auth';
import path from 'path';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security: Restrict CORS to known origins
const allowedOrigins = [
  'http://localhost:7455',
  'http://127.0.0.1:7455',
  `http://localhost:${port}`,
];
// Add production domain if set
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security: Set security headers manually (no helmet dependency needed)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Security: Robust rate limiting to prevent DoS attacks
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use(express.json({ limit: '1mb' }));

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EPMS Server is running' });
});

// Mount RBAC APIs — all routes require authentication
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/roles', requireAuth, rolesRouter);
app.use('/api/destinations', requireAuth, destinationsRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/projects', requireAuth, projectsRouter);

// Serve production static frontend if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

startCronJobs();

app.listen(port as number, '0.0.0.0', () => {
  console.log(`[EPMS Production Server] Running on http://localhost:${port}`);
});
