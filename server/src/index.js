import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDatabase } from './db.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);

initDatabase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploaded assets (seed artwork + user uploads)
const uploadsDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'stampsbox-storefront-api', time: new Date().toISOString() });
});

// Public Storefront & PayPal API
app.use('/api', publicRouter);

// Admin CMS & Management API
app.use('/api/admin', adminRouter);

// Serve built frontend in production if client/dist exists
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`StampsBox Storefront API running on http://localhost:${PORT}`);
});
