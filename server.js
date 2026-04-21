require('dotenv').config();   // ← loads .env for local development
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
    'https://smartmoneyledger.online',
    'https://www.smartmoneyledger.online',
    'http://localhost:3001',        // ← local dev (same server)
    'http://localhost:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (curl, health checks, same-origin)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS: origin not allowed → ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.options('*', cors());   // handle preflight for all routes
app.use(express.json());

// ── Serve frontend static files ───────────────────────────────
// Must come BEFORE API routes so static assets (css, js) are served first
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ────────────────────────────────────────────────
app.all('/api/login',           require('./api/login'));
app.all('/api/signup',          require('./api/signup'));
app.all('/api/verify-otp',      require('./api/verify-otp'));
app.all('/api/resend-otp',      require('./api/resend-otp'));
app.all('/api/forgot-password', require('./api/forgot-password'));
app.all('/api/reset-password',  require('./api/reset-password'));
app.all('/api/transactions',    require('./api/transactions'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'SpendWise API' }));

// ── Email diagnostic (temporary) ──────────────────────────────
app.get('/api/debug-email', async (req, res) => {
    const info = {
        RESEND_API_KEY_set: !!process.env.RESEND_API_KEY,
        RESEND_API_KEY_prefix: process.env.RESEND_API_KEY?.substring(0, 8) || 'NOT SET',
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'NOT SET',
        RESEND_FROM_EMAIL_length: (process.env.RESEND_FROM_EMAIL || '').length,
        RESEND_FROM_EMAIL_charCodes: [...(process.env.RESEND_FROM_EMAIL || '')].map(c => c.charCodeAt(0)),
        MONGODB_URI_set: !!process.env.MONGODB_URI,
        JWT_SECRET_set: !!process.env.JWT_SECRET,
    };

    // Try actually sending a test email
    try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: 'yuvrajgayatri18@gmail.com',
            subject: 'SpendWise Debug Test',
            html: '<p>Debug test from production</p>',
        });
        info.email_test_result = result;
    } catch (e) {
        info.email_test_error = e.message;
    }

    res.json(info);
});

// ── SPA Fallback — serve index.html for any unmatched route ──
// Needed so browser refreshes on hash routes still work
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SpendWise running at http://localhost:${PORT}`));

module.exports = app;
