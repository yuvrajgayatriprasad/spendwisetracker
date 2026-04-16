const express = require('express');
const cors = require('cors');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
    'https://smartmoneyledger.online',
    'https://www.smartmoneyledger.online',
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (curl, Render health checks)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS: origin not allowed → ' + origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.options('*', cors()); // handle preflight for all routes
app.use(express.json());

// ── Routes (reuse existing serverless handlers) ───────────────
app.all('/api/login',           require('./api/login'));
app.all('/api/signup',          require('./api/signup'));
app.all('/api/verify-otp',      require('./api/verify-otp'));
app.all('/api/resend-otp',      require('./api/resend-otp'));
app.all('/api/forgot-password', require('./api/forgot-password'));
app.all('/api/reset-password',  require('./api/reset-password'));
app.all('/api/transactions',    require('./api/transactions'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'SpendWise API' }));

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SpendWise API running on port ${PORT}`));

module.exports = app;
