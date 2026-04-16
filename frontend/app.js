// ========================================
// SpendWise SPA - Client-Side Router
// ========================================

const app = document.getElementById('app');
let currentPage = '';
let authEmail = ''; // tracks email during signup/reset flows
let authFlowType = 'signup'; // 'signup' or 'reset'
let resetToken = ''; // temporary token for password reset

// ========== API HELPER ==========

// 🔧 Replace this with your actual Render URL after deploying the backend
const API_BASE = 'https://YOUR-APP-NAME.onrender.com';

async function api(endpoint, body, method) {
    method = method || (body ? 'POST' : 'GET');
    const token = getToken();
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + '/api/' + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

// ========== USER SESSION ==========
function getToken() { return localStorage.getItem('sw_token'); }
function setToken(token) { localStorage.setItem('sw_token', token); }
function isLoggedIn() { return !!getToken(); }

function getUser() {
    const data = localStorage.getItem('sw_user');
    return data ? JSON.parse(data) : { name: 'User', email: '' };
}
function setUser(name, email) {
    localStorage.setItem('sw_user', JSON.stringify({ name, email }));
}
function getUserInitials() {
    const u = getUser();
    return u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function logout() {
    localStorage.removeItem('sw_user');
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_currency');
    showToast('Logged out successfully', 'info');
    setTimeout(() => navigate('login'), 500);
}

// ========== CURRENCY SYSTEM ==========
const currencyMap = {
    'USD': { symbol: '$', label: 'USD - US Dollar', short: 'USD $' },
    'EUR': { symbol: '€', label: 'EUR - Euro', short: 'EUR €' },
    'GBP': { symbol: '£', label: 'GBP - British Pound', short: 'GBP £' },
    'INR': { symbol: '₹', label: 'INR - Indian Rupee', short: 'INR ₹' }
};

function getCurrency() { return localStorage.getItem('sw_currency') || 'USD'; }
function setCurrency(code) { localStorage.setItem('sw_currency', code); }
function cs() { return currencyMap[getCurrency()].symbol; }
function fmt(n) { return cs() + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 }); }
function fmtWhole(n) { return cs() + n; }

function currencySelect(extraClass) {
    const cur = getCurrency();
    return `<select class="currency-select ${extraClass||''}" onchange="onCurrencyChange(this.value)">${Object.keys(currencyMap).map(c => `<option value="${c}" ${c===cur?'selected':''}>${currencyMap[c].short}</option>`).join('')}</select>`;
}

function settingsCurrencySelect() {
    const cur = getCurrency();
    return `<select id="settingsCurrency" onchange="onCurrencyChange(this.value)">${Object.keys(currencyMap).map(c => `<option value="${c}" ${c===cur?'selected':''}>${currencyMap[c].label}</option>`).join('')}</select>`;
}

function onCurrencyChange(code) {
    setCurrency(code);
    render(); // re-render current page with new currency
    showToast('Currency changed to ' + currencyMap[code].short);
}

function navigate(page) {
    currentPage = page;
    window.location.hash = page;
    render();
}

function render() {
    const page = window.location.hash.slice(1) || 'home';
    currentPage = page;
    // Auth guard: redirect to login if not authenticated on protected pages
    const protectedPages = ['dashboard','analytics','transactions','budgets','savings','settings'];
    if (protectedPages.includes(page) && !isLoggedIn()) {
        navigate('login'); return;
    }
    // Redirect to dashboard if already logged in and visiting auth pages
    const authPages = ['login','signup','home'];
    if (authPages.includes(page) && isLoggedIn()) {
        navigate('dashboard'); return;
    }
    const pages = { home: homePage, login: loginPage, signup: signupPage, forgot: forgotPage, otp: otpPage, resetpw: resetPasswordPage, dashboard: dashboardPage, analytics: analyticsPage, transactions: transactionsPage, budgets: budgetsPage, savings: savingsPage, settings: settingsPage };
    app.innerHTML = (pages[page] || loginPage)();
    initPageLogic(page);
    window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

// Toast
function showToast(msg, type = 'success') {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    t.innerHTML = `<span class="material-icons-outlined">${icon}</span><span class="toast-msg">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

// Sidebar template
function sidebar(active) {
    const links = [
        ['dashboard', 'dashboard', 'Dashboard'],
        ['transactions', 'receipt_long', 'Transactions'],
        ['analytics', 'analytics', 'Analytics'],
        ['budgets', 'account_balance_wallet', 'Budgets'],
        ['savings', 'savings', 'Savings'],
        ['settings', 'settings', 'Settings']
    ];
    return `<aside class="sidebar">
        <a class="sidebar-logo" href="#dashboard">
            <div class="logo-icon"><span class="material-icons-outlined">account_balance</span></div>
            <div><span class="logo-text">SpendWise</span><span class="logo-sub">Premium Plan</span></div>
        </a>
        <nav class="sidebar-nav">
            ${links.map(([pg, ico, lbl]) => `<a class="sidebar-link ${active === pg ? 'active' : ''}" href="#${pg}"><span class="material-icons-outlined">${ico}</span>${lbl}</a>`).join('')}
        </nav>
        <div class="sidebar-user">
            <div class="sidebar-avatar">${getUserInitials()}</div>
            <div class="sidebar-user-info"><div class="name">${getUser().name}</div><div class="plan">${getUser().email}</div></div>
        </div>
    </aside>`;
}

function dashLayout(active, content) {
    return `<div class="dashboard-layout">${sidebar(active)}<main class="main-content">${content}</main></div>`;
}

// ========== LANDING PAGE ==========

function landingIllustration() {
    return `<svg viewBox="0 0 460 380" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:500px;filter:drop-shadow(0 20px 60px rgba(34,197,94,0.12))">
  <ellipse cx="230" cy="355" rx="200" ry="28" fill="rgba(34,197,94,0.06)"/>
  <circle cx="75" cy="75" r="80" fill="rgba(34,197,94,0.03)" stroke="rgba(34,197,94,0.07)" stroke-width="1"/>
  <circle cx="395" cy="305" r="55" fill="rgba(59,130,246,0.03)" stroke="rgba(59,130,246,0.07)" stroke-width="1"/>
  <!-- Phone frame -->
  <rect x="158" y="12" width="172" height="328" rx="24" fill="#141622" stroke="rgba(255,255,255,0.09)" stroke-width="1.5"/>
  <rect x="167" y="26" width="154" height="300" rx="15" fill="#0c0e1a"/>
  <rect x="206" y="16" width="76" height="13" rx="6.5" fill="#0c0e1a"/>
  <!-- Screen: top bar -->
  <rect x="177" y="35" width="78" height="6" rx="3" fill="rgba(255,255,255,0.13)"/>
  <rect x="290" y="35" width="23" height="6" rx="3" fill="#22c55e" opacity="0.85"/>
  <!-- Balance card -->
  <rect x="177" y="50" width="134" height="68" rx="13" fill="rgba(34,197,94,0.13)" stroke="rgba(34,197,94,0.2)" stroke-width="1"/>
  <rect x="187" y="61" width="58" height="5" rx="2.5" fill="rgba(255,255,255,0.36)"/>
  <rect x="187" y="74" width="88" height="11" rx="4" fill="rgba(255,255,255,0.9)"/>
  <rect x="187" y="94" width="13" height="5" rx="2" fill="#22c55e" opacity="0.75"/>
  <rect x="204" y="94" width="50" height="5" rx="2" fill="#22c55e" opacity="0.5"/>
  <!-- Chart card -->
  <rect x="177" y="128" width="134" height="98" rx="13" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <rect x="187" y="138" width="52" height="5" rx="2.5" fill="rgba(255,255,255,0.25)"/>
  <line x1="182" y1="216" x2="305" y2="216" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
  <rect x="187" y="178" width="12" height="38" rx="4" fill="rgba(34,197,94,0.28)"/>
  <rect x="204" y="168" width="12" height="48" rx="4" fill="rgba(34,197,94,0.38)"/>
  <rect x="221" y="158" width="12" height="58" rx="4" fill="#22c55e"/>
  <rect x="238" y="170" width="12" height="46" rx="4" fill="rgba(34,197,94,0.38)"/>
  <rect x="255" y="176" width="12" height="40" rx="4" fill="rgba(34,197,94,0.32)"/>
  <rect x="272" y="163" width="12" height="53" rx="4" fill="rgba(34,197,94,0.42)"/>
  <rect x="289" y="172" width="8" height="44" rx="4" fill="rgba(34,197,94,0.28)"/>
  <!-- Transactions -->
  <rect x="177" y="238" width="134" height="23" rx="8" fill="rgba(255,255,255,0.04)"/>
  <circle cx="190" cy="249" r="7" fill="rgba(239,68,68,0.18)"/>
  <rect x="203" y="244" width="52" height="4.5" rx="2" fill="rgba(255,255,255,0.18)"/>
  <rect x="203" y="251" width="34" height="3.5" rx="1.5" fill="rgba(255,255,255,0.09)"/>
  <rect x="279" y="245" width="26" height="5" rx="2" fill="rgba(239,68,68,0.55)"/>
  <rect x="177" y="267" width="134" height="23" rx="8" fill="rgba(255,255,255,0.04)"/>
  <circle cx="190" cy="278" r="7" fill="rgba(34,197,94,0.18)"/>
  <rect x="203" y="273" width="52" height="4.5" rx="2" fill="rgba(255,255,255,0.18)"/>
  <rect x="203" y="280" width="34" height="3.5" rx="1.5" fill="rgba(255,255,255,0.09)"/>
  <rect x="279" y="274" width="26" height="5" rx="2" fill="rgba(34,197,94,0.55)"/>
  <rect x="177" y="296" width="134" height="23" rx="8" fill="rgba(255,255,255,0.04)"/>
  <circle cx="190" cy="307" r="7" fill="rgba(245,158,11,0.18)"/>
  <rect x="203" y="302" width="52" height="4.5" rx="2" fill="rgba(255,255,255,0.18)"/>
  <rect x="203" y="309" width="34" height="3.5" rx="1.5" fill="rgba(255,255,255,0.09)"/>
  <rect x="279" y="303" width="26" height="5" rx="2" fill="rgba(245,158,11,0.55)"/>
  <!-- Left person (yellow) -->
  <circle cx="84" cy="112" r="25" fill="#f59e0b"/>
  <ellipse cx="77" cy="107" rx="9" ry="7" fill="rgba(255,255,255,0.15)"/>
  <rect x="68" y="137" width="32" height="50" rx="13" fill="#f59e0b"/>
  <rect x="68" y="183" width="13" height="44" rx="7" fill="#d97706"/>
  <rect x="87" y="183" width="13" height="44" rx="7" fill="#d97706"/>
  <rect x="62" y="223" width="20" height="9" rx="4.5" fill="#92400e"/>
  <rect x="82" y="223" width="20" height="9" rx="4.5" fill="#92400e"/>
  <path d="M100 152 C120 145 142 148 158 153" stroke="#f59e0b" stroke-width="13" stroke-linecap="round" fill="none"/>
  <rect x="50" y="144" width="18" height="11" rx="5.5" fill="#d97706"/>
  <!-- Right person (teal) -->
  <circle cx="376" cy="112" r="25" fill="#10b981"/>
  <ellipse cx="369" cy="107" rx="9" ry="7" fill="rgba(255,255,255,0.15)"/>
  <rect x="360" y="137" width="32" height="50" rx="13" fill="#10b981"/>
  <rect x="360" y="183" width="13" height="44" rx="7" fill="#059669"/>
  <rect x="379" y="183" width="13" height="44" rx="7" fill="#059669"/>
  <rect x="354" y="223" width="20" height="9" rx="4.5" fill="#065f46"/>
  <rect x="374" y="223" width="20" height="9" rx="4.5" fill="#065f46"/>
  <path d="M360 152 C340 145 318 148 302 153" stroke="#10b981" stroke-width="13" stroke-linecap="round" fill="none"/>
  <rect x="392" y="144" width="18" height="11" rx="5.5" fill="#059669"/>
  <!-- Plant -->
  <rect x="26" y="278" width="16" height="62" rx="6" fill="#4b5563"/>
  <rect x="16" y="335" width="38" height="20" rx="6" fill="#374151"/>
  <ellipse cx="34" cy="267" rx="31" ry="25" fill="#16a34a"/>
  <ellipse cx="14" cy="284" rx="21" ry="17" fill="#15803d"/>
  <ellipse cx="54" cy="284" rx="21" ry="17" fill="#15803d"/>
  <ellipse cx="34" cy="250" rx="17" ry="14" fill="#22c55e" opacity="0.75"/>
  <!-- Floating coin -->
  <circle cx="58" cy="200" r="23" fill="#f59e0b" opacity="0.95"/>
  <circle cx="58" cy="200" r="17" fill="#fbbf24"/>
  <circle cx="58" cy="200" r="10" fill="#fcd34d" opacity="0.55"/>
  <!-- Stats card (right) -->
  <rect x="322" y="198" width="96" height="73" rx="14" fill="#111827" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <rect x="334" y="210" width="46" height="5" rx="2.5" fill="rgba(255,255,255,0.25)"/>
  <rect x="334" y="222" width="66" height="9" rx="3" fill="#22c55e" opacity="0.8"/>
  <circle cx="352" cy="250" r="16" fill="none" stroke="#1f2937" stroke-width="6"/>
  <circle cx="352" cy="250" r="16" fill="none" stroke="#22c55e" stroke-width="5" stroke-dasharray="20 80" stroke-dashoffset="25"/>
  <circle cx="352" cy="250" r="16" fill="none" stroke="#3b82f6" stroke-width="5" stroke-dasharray="24 76" stroke-dashoffset="-15"/>
  <circle cx="352" cy="250" r="16" fill="none" stroke="#f59e0b" stroke-width="5" stroke-dasharray="16 84" stroke-dashoffset="-39"/>
  <rect x="376" y="241" width="34" height="9" rx="3" fill="rgba(255,255,255,0.5)"/>
  <rect x="376" y="254" width="24" height="5" rx="2" fill="rgba(255,255,255,0.2)"/>
  <!-- Sparkles -->
  <circle cx="136" cy="40" r="5" fill="#22c55e" opacity="0.7"/>
  <circle cx="318" cy="28" r="3.5" fill="#22c55e" opacity="0.5"/>
  <circle cx="398" cy="74" r="5" fill="#f59e0b" opacity="0.6"/>
  <circle cx="46" cy="252" r="3" fill="#3b82f6" opacity="0.5"/>
  <circle cx="418" cy="185" r="4" fill="#22c55e" opacity="0.4"/>
  <line x1="136" y1="40" x2="162" y2="68" stroke="rgba(34,197,94,0.18)" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="318" y1="28" x2="300" y2="54" stroke="rgba(34,197,94,0.18)" stroke-width="1.5" stroke-dasharray="4 4"/>
</svg>`;
}

function homePage() {
    const features = [
        { icon: 'check_circle', title: 'Easy to Use', desc: 'Our intuitive interface makes it effortless to track expenses and stay on top of your finances every day.' },
        { icon: 'insights', title: 'Financial Insights', desc: 'Get detailed reports and visualizations to understand where your money goes and how to save more effectively.' },
        { icon: 'today', title: 'Daily Tracking', desc: 'Easily log and categorize your daily expenses, ensuring you stay on top of your spending habits.' },
        { icon: 'group', title: 'Group Expenses', desc: 'Organize shared expenses, split costs, and settle up easily with friends and family.' },
        { icon: 'category', title: 'Categorization', desc: 'Our smart system automatically categorizes your expenses based on description, saving you time.' },
        { icon: 'auto_awesome', title: 'AI-Driven Insights', desc: 'Get personalized spending insights and recommendations powered by AI to make smarter decisions.' },
    ];
    return `<div class="lp-wrap">
        <nav class="lp-nav">
            <a href="#home" class="lp-logo">
                <div class="logo-icon" style="width:36px;height:36px;background:#22c55e;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#000">
                    <span class="material-icons-outlined" style="font-size:20px">account_balance</span>
                </div>
                <span class="lp-brand">spendwise</span>
            </a>
            <div class="lp-nav-right">
                <a href="#login" class="lp-signin">Sign In</a>
                <a href="#signup" class="lp-cta">Get Started &rarr;</a>
            </div>
        </nav>
        <section class="lp-hero">
            <div class="lp-hero-text">
                <h1 class="lp-title">Take control of your<br>expenses today.</h1>
                <p class="lp-tagline"><span>Track your spending, unleash your saving!</span><br><span>Transform expenses into financial freedom!</span></p>
                <p class="lp-desc">SpendWise empowers you to make informed financial decisions. Our intuitive tools help you visualize your spending patterns, set realistic budgets, and achieve your financial goals with ease.</p>
                <a href="#signup" class="lp-hero-btn">Start Your Journey &rarr;</a>
            </div>
            <div class="lp-hero-visual">${landingIllustration()}</div>
        </section>
        <section class="lp-features">
            <h2 class="lp-features-title">Why SpendWise?</h2>
            <div class="lp-features-grid">
                ${features.map(f => `<div class="lp-feature-card">
                    <div class="lp-feature-icon"><span class="material-icons-outlined">${f.icon}</span></div>
                    <h3>${f.title}</h3>
                    <p>${f.desc}</p>
                </div>`).join('')}
            </div>
        </section>
        <footer class="lp-footer">
            <div class="lp-footer-logo">
                <div class="logo-icon" style="width:30px;height:30px;background:#22c55e;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#000">
                    <span class="material-icons-outlined" style="font-size:17px">account_balance</span>
                </div>
                SpendWise
            </div>
            <p class="lp-footer-copy">&copy; 2026 SpendWise. All rights reserved.</p>
            <div class="lp-footer-links">
                <a href="#login">Sign In</a>
                <a href="#signup">Create Account</a>
            </div>
        </footer>
    </div>`;
}

// ========== AUTH PAGES ==========

function authWrap(body, showFooter = true) {
    return `<div class="auth-page">
        <div class="auth-header">
            <a class="auth-logo" href="#login"><div class="logo-icon"><span class="material-icons-outlined">account_balance</span></div>SpendWise</a>
            <a class="auth-header-link" href="#login">Secure Cloud Access</a>
        </div>
        <div class="auth-body">${body}</div>
        ${showFooter ? `<div class="auth-footer"><p>&copy; 2026 SpendWise. All rights reserved. Built for modern financial freedom.</p><div class="auth-footer-links"><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Help Center</a></div></div>` : ''}
    </div>`;
}

function loginPage() {
    return authWrap(`<div class="auth-card">
        <div class="auth-card-icon"><span class="material-icons-outlined">lock</span></div>
        <h1>Welcome Back</h1>
        <p class="subtitle">Manage your finances with precision</p>
        <form id="loginForm">
            <div class="form-group">
                <div class="form-label">Email Address</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">email</span><input class="form-input" type="email" placeholder="name@example.com" required id="loginEmail"></div>
            </div>
            <div class="form-group">
                <div class="form-label">Password <a href="#forgot">Forgot password?</a></div>
                <div class="form-input-wrap"><span class="material-icons-outlined">lock</span><input class="form-input" type="password" placeholder="••••••••" required id="loginPw"><button type="button" class="toggle-pw" onclick="togglePw('loginPw',this)"><span class="material-icons-outlined">visibility_off</span></button></div>
            </div>
            <div class="checkbox-wrap"><input type="checkbox" id="remember"><label for="remember">Remember this device</label></div>
            <button class="btn-primary" type="submit">Sign In</button>
        </form>
        <div class="divider">or continue with</div>
        <button class="btn-google" onclick="showToast('Google sign-in coming soon','info')"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>Google</button>
        <div class="auth-switch">Don't have an account? <a href="#signup">Create an account</a></div>
    </div>`);
}

function signupPage() {
    return authWrap(`<div class="auth-card">
        <div class="auth-card-icon"><span class="material-icons-outlined">account_balance</span></div>
        <h1 style="color:var(--primary)">SpendWise</h1>
        <p class="subtitle">Join the Architectural Vault of Finance</p>
        <form id="signupForm">
            <div class="form-group">
                <div class="form-label">Full Name</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">person</span><input class="form-input" type="text" placeholder="Enter your full name" required id="signupName"></div>
            </div>
            <div class="form-group">
                <div class="form-label">Email Address</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">email</span><input class="form-input" type="email" placeholder="name@company.com" required id="signupEmail"></div>
            </div>
            <div class="form-group">
                <div class="form-label">Set Password</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">lock</span><input class="form-input" type="password" placeholder="••••••••" required id="signupPw"><button type="button" class="toggle-pw" onclick="togglePw('signupPw',this)"><span class="material-icons-outlined">visibility_off</span></button></div>
            </div>
            <button class="btn-primary" type="submit">Create Account &rarr;</button>
        </form>
        <div class="auth-switch">Already have an account? <a href="#login">Sign In</a></div>
        <div class="secure-badge"><span class="material-icons-outlined" style="font-size:16px">verified_user</span>AES-256 Encrypted &nbsp; <span class="material-icons-outlined" style="font-size:16px">shield</span>FDIC Insured</div>
    </div>`);
}

function forgotPage() {
    return authWrap(`<div class="auth-card">
        <div class="auth-card-icon"><span class="material-icons-outlined">lock_reset</span></div>
        <h1>Forgot Password</h1>
        <p class="subtitle">Enter your email address and we'll send you a link to reset your password.</p>
        <form id="forgotForm">
            <div class="form-group">
                <div class="form-label">Email Address</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">email</span><input class="form-input" type="email" placeholder="name@company.com" required id="forgotEmail"></div>
            </div>
            <button class="btn-primary" type="submit">Send Reset Link &rarr;</button>
        </form>
        <a class="back-link" href="#login"><span class="material-icons-outlined" style="font-size:18px">arrow_back</span> Back to Login</a>
        <div class="secure-badge"><span class="material-icons-outlined" style="font-size:16px">lock</span>Secure &amp; Encrypted</div>
    </div>`);
}

function otpPage() {
    const emailDisplay = authEmail ? `<p class="subtitle">A 6-digit code was sent to <strong>${authEmail}</strong></p>` : `<p class="subtitle">A 6-digit code was sent to your email</p>`;
    return authWrap(`<div class="auth-card" style="text-align:center">
        <div class="otp-badge"><span class="material-icons-outlined" style="font-size:14px">lock</span>Secure Verification</div>
        <h1>${authFlowType === 'reset' ? 'Reset Password' : 'Verify Your Identity'}</h1>
        ${emailDisplay}
        <div id="authError" class="auth-error" style="display:none"></div>
        <div class="otp-inputs">${[0,1,2,3,4,5].map((i) => `<input class="otp-input" type="text" maxlength="1" id="otp${i}" ${i===0?'autofocus':''}>`).join('')}</div>
        <button class="btn-primary" id="verifyBtn">Verify &amp; Continue</button>
        <div class="resend-wrap" style="margin-top:16px">Didn't receive code?<br><button class="resend-btn" id="resendBtn">Resend OTP</button> <span class="resend-timer" id="resendTimer">00:59</span></div>
    </div>`);
}

function resetPasswordPage() {
    return authWrap(`<div class="auth-card">
        <div class="auth-card-icon"><span class="material-icons-outlined">lock_reset</span></div>
        <h1>Set New Password</h1>
        <p class="subtitle">Create a strong new password for your account</p>
        <div id="authError" class="auth-error" style="display:none"></div>
        <form id="resetPwForm">
            <div class="form-group">
                <div class="form-label">New Password</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">lock</span><input class="form-input" type="password" placeholder="••••••••" required id="newPw" minlength="6"><button type="button" class="toggle-pw" onclick="togglePw('newPw',this)"><span class="material-icons-outlined">visibility_off</span></button></div>
            </div>
            <div class="form-group">
                <div class="form-label">Confirm Password</div>
                <div class="form-input-wrap"><span class="material-icons-outlined">lock</span><input class="form-input" type="password" placeholder="••••••••" required id="confirmPw" minlength="6"><button type="button" class="toggle-pw" onclick="togglePw('confirmPw',this)"><span class="material-icons-outlined">visibility_off</span></button></div>
            </div>
            <button class="btn-primary" type="submit" id="resetPwBtn">Reset Password &rarr;</button>
        </form>
        <a class="back-link" href="#login"><span class="material-icons-outlined" style="font-size:18px">arrow_back</span> Back to Login</a>
    </div>`);
}

// ========== DASHBOARD PAGES ==========

function dashboardPage() {
    return dashLayout('dashboard', `
        <div class="page-header"><div><h1>Dashboard</h1></div>
            <div class="page-header-actions"><button class="btn-new" onclick="showTransactionModal()"><span class="material-icons-outlined" style="font-size:18px">add</span> New Entry</button></div>
        </div>
        <div class="stat-cards">
            <div class="stat-card primary-card"><div class="stat-label">Total Balance</div><div class="stat-value">${fmt(12450.80)}</div><div class="stat-change positive">↑ +12.5% from last month</div></div>
            <div class="stat-card"><div class="stat-label">This Month's Spending</div><div class="stat-value">${fmt(3240.15)}</div><div class="stat-bar"><div class="stat-bar-fill" style="width:65%"></div></div><div class="stat-change" style="color:var(--text-muted);margin-top:6px">65% of your monthly budget used</div></div>
            <div class="stat-card"><div class="stat-label">Daily Average</div><div class="stat-value">${fmt(104.50)}</div><div class="stat-change negative">↑ 5% more than average</div></div>
        </div>
        <div class="content-grid">
            <div class="card quick-add"><h3><span class="material-icons-outlined">bolt</span> Quick Add</h3>
                <div class="form-group-sm"><label>Description</label><input type="text" placeholder="Grocery shopping..." id="qaDesc"></div>
                <div class="form-row"><div class="form-group-sm"><label>Amount</label><input type="number" placeholder="0.00" id="qaAmount"></div><div class="form-group-sm"><label>Category</label><select id="qaCat"><option>Food</option><option>Transport</option><option>Entertainment</option><option>Utilities</option><option>Housing</option><option>Health</option></select></div></div>
                <button class="btn-add-transaction" onclick="addQuickTransaction()">Add Transaction</button>
            </div>
            <div class="card"><div class="card-header"><h2>Recent Transactions</h2><a class="card-header-link" href="#transactions">View All</a></div>
                <ul class="transaction-list" id="recentTxList"></ul>
                <button class="load-more-btn" onclick="navigate('transactions')">Load More Transactions</button>
            </div>
        </div>
        <div class="content-grid" style="margin-top:0">
            <div class="card"><div class="card-header"><h2>Daily Spending</h2><span style="font-size:0.78rem;color:var(--text-muted)">LAST 7 DAYS</span></div>
                <div class="bar-chart">${['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d,i) => {const h = [45,65,30,80,55,20,70][i]; return `<div class="bar-group"><div class="bar ${i===3?'active':''}" style="height:${h}%"></div><span class="bar-label">${d}</span></div>`;}).join('')}</div>
            </div>
        </div>
        <div id="modalContainer"></div>
    `);
}

function analyticsPage() {
    return dashLayout('analytics', `
        <div class="page-header"><div><h1>Analytics &amp; Insights</h1><p class="page-subtitle">Visualize your financial habits and trends.</p></div>
            <div class="page-header-actions">${currencySelect()}
                <div class="time-tabs"><button class="time-tab" onclick="setTab(this)">This Week</button><button class="time-tab active" onclick="setTab(this)">This Month</button><button class="time-tab" onclick="setTab(this)">Last 3 Months</button></div>
            </div>
        </div>
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-label">Total Spending</div><div class="stat-value">${fmt(4285.40)}</div><div class="stat-change negative">↑ +2%</div></div>
            <div class="stat-card"><div class="stat-label">Savings Potential</div><div class="stat-value" style="color:var(--success)">${fmt(840)}</div><div class="stat-change positive">Based on reduced spending</div></div>
            <div class="stat-card"><div class="stat-label">Highest Category</div><div class="stat-value" style="font-size:1.3rem">Dining Out</div><div class="stat-change" style="color:var(--text-muted)">28% of total spending</div></div>
            <div class="stat-card"><div class="stat-label">Days to Goal</div><div class="stat-value">14 Days</div><div class="stat-change" style="color:var(--text-muted)">To reach Hawaii Trip target</div></div>
        </div>
        <div class="content-grid">
            <div class="card"><div class="card-header"><h2>Spending Trends</h2><span style="font-size:.75rem;color:var(--text-muted)">MAY 1 - MAY 31, 2024</span></div>
                <div class="chart-placeholder"><div class="chart-line"><svg viewBox="0 0 500 180" preserveAspectRatio="none"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(99,102,241,0.2)"/><stop offset="100%" stop-color="rgba(99,102,241,0)"/></linearGradient></defs><path d="M0,140 C50,120 80,60 120,80 C160,100 180,40 220,30 C260,20 280,70 320,60 C360,50 400,90 440,70 C460,60 480,80 500,75" fill="none" stroke="#4338CA" stroke-width="2.5"/><path d="M0,140 C50,120 80,60 120,80 C160,100 180,40 220,30 C260,20 280,70 320,60 C360,50 400,90 440,70 C460,60 480,80 500,75 L500,180 L0,180 Z" fill="url(#cg)"/></svg></div><div class="chart-x-labels"><span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 31</span></div></div>
            </div>
            <div class="card"><div class="card-header"><h2>Spending by Category</h2></div>
                <div class="donut-chart"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#4338CA" stroke-width="4" stroke-dasharray="30 70" stroke-dashoffset="0"/><circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" stroke-width="4" stroke-dasharray="25 75" stroke-dashoffset="-30"/><circle cx="18" cy="18" r="14" fill="none" stroke="#EC4899" stroke-width="4" stroke-dasharray="20 80" stroke-dashoffset="-55"/><circle cx="18" cy="18" r="14" fill="none" stroke="#06B6D4" stroke-width="4" stroke-dasharray="15 85" stroke-dashoffset="-75"/></svg></div>
                <div class="chart-legend"><div class="legend-item"><span class="legend-dot" style="background:#4338CA"></span>Housing</div><div class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span>Food</div><div class="legend-item"><span class="legend-dot" style="background:#EC4899"></span>Leisure</div><div class="legend-item"><span class="legend-dot" style="background:#06B6D4"></span>Transport</div></div>
            </div>
        </div>
        <div class="card"><div class="card-header"><h2>Monthly Budget Progress</h2></div>
            <div class="budget-category"><div class="budget-category-header"><div class="budget-cat-icon" style="background:#FEE2E2;color:#DC2626"><span class="material-icons-outlined">restaurant</span></div><div class="budget-cat-info"><div class="cat-name">Dining &amp; Leisure</div><div class="cat-desc"><span style="color:var(--danger);font-weight:600">⚠ NEAR LIMIT</span></div></div><div class="budget-cat-amounts"><div class="spent">${fmtWhole('780')} <span class="total">/ ${fmtWhole('800')}</span></div></div></div><div class="budget-bar"><div class="budget-bar-fill red" style="width:97%"></div></div></div>
            <div class="budget-category"><div class="budget-category-header"><div class="budget-cat-icon" style="background:#D1FAE5;color:#059669"><span class="material-icons-outlined">shopping_cart</span></div><div class="budget-cat-info"><div class="cat-name">Groceries</div></div><div class="budget-cat-amounts"><div class="spent">${fmtWhole('340')} <span class="total">/ ${fmtWhole('600')}</span></div></div></div><div class="budget-bar"><div class="budget-bar-fill blue" style="width:57%"></div></div></div>
            <div class="budget-category"><div class="budget-category-header"><div class="budget-cat-icon" style="background:#DBEAFE;color:#2563EB"><span class="material-icons-outlined">directions_car</span></div><div class="budget-cat-info"><div class="cat-name">Transportation</div></div><div class="budget-cat-amounts"><div class="spent">${fmtWhole('120')} <span class="total">/ ${fmtWhole('400')}</span></div></div></div><div class="budget-bar"><div class="budget-bar-fill green" style="width:30%"></div></div></div>
        </div>
    `);
}

function transactionsPage() {
    return dashLayout('transactions', `
        <div class="page-header"><div><h1>Transaction History</h1></div>
            <div class="page-header-actions">${currencySelect()}<button class="btn-icon-sm"><span class="material-icons-outlined" style="font-size:20px">notifications</span></button><button class="btn-icon-sm"><span class="material-icons-outlined" style="font-size:20px">search</span></button><button class="btn-new" onclick="showTransactionModal()"><span class="material-icons-outlined" style="font-size:18px">add</span> New Transaction</button></div>
        </div>
        <div class="filters-bar"><div class="search-wrap"><span class="material-icons-outlined">search</span><input placeholder="Search for merchant or category..." id="txSearch" oninput="filterTransactions()"></div><button class="filter-btn"><span class="material-icons-outlined" style="font-size:18px">date_range</span>Date Range</button><button class="filter-btn"><span class="material-icons-outlined" style="font-size:18px">filter_list</span>Categories</button></div>
        <div class="card"><ul class="transaction-list" id="fullTxList"></ul>
            <div class="pagination"><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">3</button><span class="page-dots">...</span><button class="page-btn">12</button><button class="page-btn"><span class="material-icons-outlined" style="font-size:16px">chevron_right</span></button></div>
        </div>
        <div id="modalContainer"></div>
    `);
}

function budgetsPage() {
    return dashLayout('budgets', `
        <div class="page-header"><div><h1>Budgets</h1><p class="page-subtitle">Track your spending by category and stay within your limits.</p></div>
            <div class="page-header-actions"><button class="btn-new" onclick="showToast('New budget form coming soon','info')"><span class="material-icons-outlined" style="font-size:18px">add</span> New Budget</button></div>
        </div>
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-label">Total Budgeted</div><div class="stat-value">${fmt(4500)}</div></div>
            <div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-value" style="color:var(--primary)">${fmt(3259.50)}</div></div>
            <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value" style="color:var(--success)">${fmt(1240.50)}</div></div>
        </div>
        <div class="card"><div class="card-header"><h2>Monthly Category Allocation</h2></div>
            ${budgetCategories().map(c => `<div class="budget-category"><div class="budget-category-header"><div class="budget-cat-icon" style="background:${c.bg};color:${c.color}"><span class="material-icons-outlined">${c.icon}</span></div><div class="budget-cat-info"><div class="cat-name">${c.name}</div><div class="cat-desc">${c.desc}</div></div><div class="budget-cat-amounts"><div class="spent">${fmtWhole(c.spent)} <span class="total">/ ${fmtWhole(c.total)}</span></div><div class="pct ${c.pct>=90?'critical':''}">${c.pct>=90?'Critical: ':''}${c.pct}% utilized</div></div></div><div class="budget-bar"><div class="budget-bar-fill ${c.pct>=90?'red':c.pct>=70?'orange':'blue'}" style="width:${c.pct}%"></div></div></div>`).join('')}
            <div class="smart-tip"><span class="material-icons-outlined">lightbulb</span><span><strong>Smart Tip:</strong> You're currently spending 15% less on Transportation. Consider moving $75 to your Leisure budget.</span></div>
        </div>
    `);
}

function savingsPage() {
    return dashLayout('savings', `
        <div class="page-header"><div><h1>Savings Goals</h1><p class="page-subtitle">Manage your long-term financial milestones</p></div>
            <div class="page-header-actions"><button class="btn-new" onclick="showToast('New goal form coming soon','info')"><span class="material-icons-outlined" style="font-size:18px">add</span> Add New Goal</button></div>
        </div>
        <div class="stat-cards">
            <div class="stat-card"><div class="stat-label">Total Saved</div><div class="stat-value">${fmt(14250)}</div><div class="stat-change positive">↑ +${fmtWhole('1,200')} this month</div></div>
            <div class="stat-card"><div class="stat-label">Monthly Goal</div><div class="stat-value">${fmt(2500)}</div><div class="stat-bar"><div class="stat-bar-fill" style="width:72%"></div></div></div>
            <div class="stat-card"><div class="stat-label">Active Goals</div><div class="stat-value">4 Goals</div><div class="stat-change" style="color:var(--text-muted)">2 goals near completion</div></div>
        </div>
        <div class="savings-goals-grid">
            ${savingsGoals().map(g => `<div class="savings-goal-card"><div class="goal-image" style="background-image:url('${g.img}');background-color:${g.bg}"><div class="goal-tag">${g.tag}</div></div><div class="goal-details"><h3>${g.name}</h3><p class="goal-desc">${g.desc}</p><div class="goal-amounts"><span class="goal-amt">${fmtWhole(g.saved)}</span><span class="goal-amt target">${fmtWhole(g.target)}</span></div><div class="goal-meta"><span class="material-icons-outlined" style="font-size:16px">schedule</span>Target: ${g.date}</div><span class="goal-add-funds" onclick="showToast('Funds added successfully!')"><span class="material-icons-outlined" style="font-size:16px">add_circle</span> Add Funds</span></div></div>`).join('')}
            <div class="create-goal-card" onclick="showToast('New goal form coming soon','info')"><span class="material-icons-outlined">add_circle_outline</span><h3>Create New Goal</h3><p>What are you saving for next? Start tracking now.</p></div>
        </div>
        <div class="card"><div class="card-header"><h2>Recent Contributions</h2></div>
            <table class="contributions-table"><thead><tr><th>Goal</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>
                <tr><td><span class="goal-dot" style="background:#3B82F6"></span>Hawaii Trip</td><td>Oct 24, 2023</td><td style="color:var(--success);font-weight:600">+${fmt(250)}</td><td><span class="status-badge">Completed</span></td></tr>
                <tr><td><span class="goal-dot" style="background:#10B981"></span>House Down Payment</td><td>Oct 22, 2023</td><td style="color:var(--success);font-weight:600">+${fmt(600)}</td><td><span class="status-badge">Completed</span></td></tr>
                <tr><td><span class="goal-dot" style="background:#EF4444"></span>Emergency Fund</td><td>Oct 15, 2023</td><td style="color:var(--success);font-weight:600">+${fmt(150)}</td><td><span class="status-badge">Completed</span></td></tr>
            </tbody></table>
            <a class="view-all-link" onclick="showToast('Full history coming soon','info')">View All History</a>
        </div>
    `);
}

function settingsPage() {
    return dashLayout('settings', `
        <div class="page-header"><div><h1>Settings</h1><p class="page-subtitle">Manage your account settings and application preferences</p></div></div>
        <div class="card">
            <div class="settings-profile"><div class="settings-avatar">${getUserInitials()}<div class="online-dot"></div></div><div class="settings-profile-info"><div class="pname">${getUser().name}</div><div class="ptype">Personal Account</div></div></div>
            <div class="settings-section"><div class="settings-fields"><div class="settings-field"><label>Full Name</label><input type="text" value="${getUser().name}" id="settingsName"></div><div class="settings-field"><label>Email Address</label><input type="email" value="${getUser().email}" id="settingsEmail" readonly style="opacity:0.6;cursor:not-allowed"></div></div></div>
            <div class="content-grid">
                <div class="settings-section"><h3><span class="material-icons-outlined">tune</span> Preferences</h3><div class="settings-field" style="max-width:280px"><label>Base Currency</label>${settingsCurrencySelect()}</div></div>
                <div class="settings-section"><h3><span class="material-icons-outlined">notifications</span> Notifications</h3>
                    <div class="notification-item"><div class="notif-info"><div class="notif-title">Daily Summary</div><div class="notif-desc">Get a digest of your daily spend every evening.</div></div><div class="toggle-switch active" onclick="toggleSwitch(this)"><div class="toggle-dot"></div></div></div>
                    <div class="notification-item"><div class="notif-info"><div class="notif-title">Budget Alerts</div><div class="notif-desc">Receive alerts when you reach 80% of your budget.</div></div><div class="toggle-switch active" onclick="toggleSwitch(this)"><div class="toggle-dot"></div></div></div>
                    <div class="notification-item"><div class="notif-info"><div class="notif-title">Newsletter</div><div class="notif-desc">Weekly tips on how to save and invest better.</div></div><div class="toggle-switch" onclick="toggleSwitch(this)"><div class="toggle-dot"></div></div></div>
                </div>
            </div>
            <div class="settings-actions"><button class="btn-discard" onclick="showToast('Changes discarded','info')">Discard Changes</button><button class="btn-save" onclick="saveSettings()">Save Changes</button></div>
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-light)"><button class="btn-primary" style="background:var(--danger);max-width:200px" onclick="logout()"><span class="material-icons-outlined" style="font-size:18px">logout</span> Logout</button></div>
        </div>
    `);
}

// ========== DATA ==========

const transactions = [
    { name: 'Whole Foods Market', cat: 'Groceries', catClass: 'groceries', icon: 'shopping_cart', amount: -84.20, time: '10:24 AM', method: 'Debit Card', date: 'Today' },
    { name: 'Freelance Payment', cat: 'Income', catClass: 'income', icon: 'payments', amount: 1200, time: '09:15 AM', method: 'Direct Deposit', date: 'Today' },
    { name: 'Starbucks Coffee', cat: 'Food & Drink', catClass: 'food', icon: 'coffee', amount: -6.50, time: '4:45 PM', method: 'Apple Pay', date: 'Yesterday' },
    { name: 'Uber Trip', cat: 'Transport', catClass: 'transport', icon: 'local_taxi', amount: -24.18, time: '1:12 PM', method: 'Debit Card', date: 'Yesterday' },
    { name: 'Netflix Subscription', cat: 'Entertainment', catClass: 'entertainment', icon: 'movie', amount: -15.99, time: '08:00 AM', method: 'Recurring', date: 'Yesterday' },
    { name: 'Salary Deposit', cat: 'Income', catClass: 'income', icon: 'account_balance', amount: 4500, time: '09:00 AM', method: 'ACH Transfer', date: 'October 20, 2023' },
    { name: 'Rent Payment', cat: 'Housing', catClass: 'housing', icon: 'home', amount: -2100, time: '09:00 AM', method: 'ACH Transfer', date: 'October 20, 2023' },
    { name: 'Equinox Gym', cat: 'Health', catClass: 'health', icon: 'fitness_center', amount: -185, time: '06:45 AM', method: 'Debit Card', date: 'October 20, 2023' },
    { name: 'Electric Bill', cat: 'Utilities', catClass: 'utilities', icon: 'bolt', amount: -85, time: '10:00 AM', method: 'Auto Pay', date: 'October 18, 2023' },
];

function budgetCategories() {
    return [
        { name: 'Housing', desc: 'Rent, Utilities, Maintenance', icon: 'home', bg: '#E0E7FF', color: '#4338CA', spent: '1,700', total: '2,000', pct: 85 },
        { name: 'Food & Groceries', desc: 'Supermarkets, Dining out', icon: 'restaurant', bg: '#FEF3C7', color: '#D97706', spent: '450', total: '800', pct: 56 },
        { name: 'Leisure', desc: 'Entertainment, Movies, Hobbies', icon: 'sports_esports', bg: '#EDE9FE', color: '#7C3AED', spent: '320', total: '400', pct: 80 },
        { name: 'Transportation', desc: 'Fuel, Public Transit, Repairs', icon: 'directions_car', bg: '#DBEAFE', color: '#2563EB', spent: '150', total: '500', pct: 30 },
        { name: 'Health', desc: 'Gym, Pharmacy, Insurance', icon: 'favorite', bg: '#FCE7F3', color: '#DB2777', spent: '750', total: '800', pct: 94 },
    ];
}

function savingsGoals() {
    return [
        { name: 'Hawaii Trip', desc: 'Dream vacation to Maui & Oahu', tag: 'Travel', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop', bg: '#3B82F6', saved: '3,500', target: '5,000', date: 'June 2024' },
        { name: 'Emergency Fund', desc: '6 months of essential expenses', tag: 'Financial', img: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400&h=200&fit=crop', bg: '#10B981', saved: '8,000', target: '10,000', date: 'Dec 2024' },
        { name: 'House Down Payment', desc: 'First home deposit fund', tag: 'Real Estate', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop', bg: '#8B5CF6', saved: '15,000', target: '50,000', date: 'June 2025' },
    ];
}

function renderTransactions(containerId, txs) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '', lastDate = '';
    txs.forEach(tx => {
        if (tx.date !== lastDate) { html += `<div class="date-divider">${tx.date}</div>`; lastDate = tx.date; }
        const isPos = tx.amount > 0;
        const typeBadge = tx.txType === 'deposit'
            ? `<span style="font-size:10px;font-weight:700;letter-spacing:.5px;color:#10b981;background:rgba(16,185,129,.12);padding:2px 7px;border-radius:20px">DEPOSIT</span>`
            : tx.txType === 'withdrawal'
            ? `<span style="font-size:10px;font-weight:700;letter-spacing:.5px;color:#ef4444;background:rgba(239,68,68,.12);padding:2px 7px;border-radius:20px">WITHDRAWAL</span>`
            : '';
        html += `<li class="transaction-item"><div class="transaction-icon ${tx.catClass}"><span class="material-icons-outlined">${tx.icon}</span></div><div class="transaction-info"><div class="name">${tx.name}</div><div class="category">${typeBadge} ${tx.cat} • ${tx.time}</div></div><div class="transaction-meta"><div class="amount" style="color:${isPos?'#10b981':'#ef4444'};font-weight:700">${isPos?'+':''}${fmt(tx.amount)}</div><div class="method">${tx.method}</div></div></li>`;
    });
    el.innerHTML = html;
}

// ========== PAGE LOGIC ==========

function showAuthError(msg) {
    const el = document.getElementById('authError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else showToast(msg, 'error');
}

function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Please wait...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
        btn.disabled = false;
    }
}

function initPageLogic(page) {
    if (page === 'login') {
        document.getElementById('loginForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPw')?.value;
            const btn = e.target.querySelector('button[type="submit"]');
            setBtnLoading(btn, true);
            try {
                const data = await api('login', { email, password });
                setToken(data.token);
                setUser(data.user.name, data.user.email);
                showToast('Login successful!');
                setTimeout(() => navigate('dashboard'), 600);
            } catch (err) {
                showToast(err.message, 'error');
                setBtnLoading(btn, false);
            }
        });
    } else if (page === 'signup') {
        document.getElementById('signupForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            const name = document.getElementById('signupName')?.value;
            const email = document.getElementById('signupEmail')?.value;
            const password = document.getElementById('signupPw')?.value;
            const btn = e.target.querySelector('button[type="submit"]');
            setBtnLoading(btn, true);
            try {
                const data = await api('signup', { name, email, password });
                authEmail = data.email || email;
                authFlowType = 'signup';
                showToast(data.message);
                setTimeout(() => navigate('otp'), 600);
            } catch (err) {
                // If account already exists and is verified → redirect to login
                if (err.message && err.message.toLowerCase().includes('already exists')) {
                    showToast('Account already exists. Redirecting to login…', 'info');
                    setTimeout(() => navigate('login'), 1200);
                } else {
                    showToast(err.message, 'error');
                    setBtnLoading(btn, false);
                }
            }
        });

    } else if (page === 'forgot') {
        document.getElementById('forgotForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail')?.value;
            const btn = e.target.querySelector('button[type="submit"]');
            setBtnLoading(btn, true);
            try {
                const data = await api('forgot-password', { email });
                authEmail = data.email || email;
                authFlowType = 'reset';
                showToast('Reset code sent to your email!');
                setTimeout(() => navigate('otp'), 600);
            } catch (err) {
                showToast(err.message, 'error');
                setBtnLoading(btn, false);
            }
        });
    } else if (page === 'otp') {
        initOtp();
    } else if (page === 'resetpw') {
        document.getElementById('resetPwForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            const newPw = document.getElementById('newPw')?.value;
            const confirmPw = document.getElementById('confirmPw')?.value;
            if (newPw !== confirmPw) { showAuthError('Passwords do not match'); return; }
            if (newPw.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
            const btn = document.getElementById('resetPwBtn');
            setBtnLoading(btn, true);
            try {
                await api('reset-password', { resetToken, newPassword: newPw });
                resetToken = '';
                showToast('Password reset successfully! Please sign in.');
                setTimeout(() => navigate('login'), 800);
            } catch (err) {
                showAuthError(err.message);
                setBtnLoading(btn, false);
            }
        });
    } else if (page === 'dashboard') {
        loadUserTransactions('recentTxList', 5);
    } else if (page === 'transactions') {
        loadUserTransactions('fullTxList', null);
    }
}

function initOtp() {
    const inputs = document.querySelectorAll('.otp-input');
    inputs.forEach((inp, i) => {
        inp.addEventListener('input', () => { if (inp.value.length === 1 && i < 5) inputs[i+1].focus(); });
        inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i-1].focus(); });
    });
    document.getElementById('verifyBtn')?.addEventListener('click', async () => {
        const code = [...inputs].map(i => i.value).join('');
        if (code.length !== 6) { showAuthError('Please enter all 6 digits'); return; }
        const btn = document.getElementById('verifyBtn');
        setBtnLoading(btn, true);
        try {
            const data = await api('verify-otp', { email: authEmail, code, type: authFlowType });
            if (data.type === 'reset') {
                resetToken = data.resetToken;
                showToast('Code verified!');
                setTimeout(() => navigate('resetpw'), 500);
            } else {
                setToken(data.token);
                setUser(data.user.name, data.user.email);
                showToast('Email verified successfully!');
                setTimeout(() => navigate('dashboard'), 600);
            }
        } catch (err) {
            showAuthError(err.message);
            setBtnLoading(btn, false);
        }
    });
    // Timer
    let sec = 59;
    const timer = setInterval(() => {
        sec--;
        const el = document.getElementById('resendTimer');
        if (el) el.textContent = `00:${sec.toString().padStart(2,'0')}`;
        if (sec <= 0) { clearInterval(timer); const btn = document.getElementById('resendBtn'); if(btn) btn.style.color = 'var(--primary)'; }
    }, 1000);
    document.getElementById('resendBtn')?.addEventListener('click', async () => {
        try {
            await api('resend-otp', { email: authEmail, type: authFlowType });
            showToast('New code sent to your email!', 'info');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function togglePw(id, btn) {
    const inp = document.getElementById(id);
    if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = '<span class="material-icons-outlined">visibility</span>'; }
    else { inp.type = 'password'; btn.innerHTML = '<span class="material-icons-outlined">visibility_off</span>'; }
}

function toggleSwitch(el) { el.classList.toggle('active'); }

function setTab(btn) {
    btn.parentElement.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}

function addQuickTransaction() {
    const desc = document.getElementById('qaDesc')?.value;
    const amount = document.getElementById('qaAmount')?.value;
    if (!desc || !amount) { showToast('Please fill in all fields', 'error'); return; }
    transactions.unshift({ name: desc, cat: document.getElementById('qaCat')?.value || 'Food', catClass: 'groceries', icon: 'receipt', amount: -parseFloat(amount), time: 'Just now', method: 'Manual', date: 'Today' });
    renderTransactions('recentTxList', transactions.slice(0, 5));
    document.getElementById('qaDesc').value = '';
    document.getElementById('qaAmount').value = '';
    showToast('Transaction added!');
}

function filterTransactions() {
    const q = document.getElementById('txSearch')?.value.toLowerCase() || '';
    const filtered = transactions.filter(t => t.name.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));
    renderTransactions('fullTxList', filtered);
}

function showTransactionModal() { showImportModal(); }

function closeModal() { const mc = document.getElementById('modalContainer'); if (mc) mc.innerHTML = ''; }

function submitModal() {
    const desc = document.getElementById('modalDesc')?.value;
    const amt = document.getElementById('modalAmt')?.value;
    const cat = document.getElementById('modalCat')?.value;
    if (!desc || !amt) { showToast('Please fill in all fields', 'error'); return; }
    const isIncome = cat === 'Income';
    transactions.unshift({ name: desc, cat, catClass: cat.toLowerCase(), icon: isIncome ? 'payments' : 'receipt', amount: isIncome ? parseFloat(amt) : -parseFloat(amt), time: 'Just now', method: 'Manual', date: 'Today' });
    closeModal();
    showToast('Transaction added successfully!');
    if (currentPage === 'dashboard') renderTransactions('recentTxList', transactions.slice(0, 5));
    if (currentPage === 'transactions') renderTransactions('fullTxList', transactions);
}

function saveSettings() {
    const cur = document.getElementById('settingsCurrency')?.value;
    if (cur) setCurrency(cur);
    const newName = document.getElementById('settingsName')?.value;
    if (newName) {
        const u = getUser();
        setUser(newName, u.email);
    }
    showToast('Settings saved successfully!');
    render();
}

// ========== IMPORT TRANSACTION FLOW ==========

function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function closeImportModal() {
    const el = document.getElementById('importOverlay');
    if (el) el.remove();
}

function showImportModal() {
    closeImportModal();
    const overlay = document.createElement('div');
    overlay.id = 'importOverlay';
    overlay.className = 'import-overlay';
    overlay.innerHTML = `
        <div class="import-modal" id="importModal">
            <button class="import-close" onclick="closeImportModal()"><span class="material-icons-outlined">close</span></button>
            <div class="import-modal-header">
                <div class="ai-badge"><span class="material-icons-outlined" style="font-size:13px">auto_awesome</span> AI POWERED CORE</div>
                <h1>Import Transaction</h1>
                <p class="import-subtitle">Effortlessly bridge your bank statements with your digital ledger using our advanced extraction engine.</p>
            </div>
            <div class="import-modal-body">
                <div class="import-left">
                    <div class="drop-zone" id="dropZone"
                         ondragover="event.preventDefault();document.getElementById('dropZone').classList.add('dragover')"
                         ondragleave="document.getElementById('dropZone').classList.remove('dragover')"
                         ondrop="handlePdfDrop(event)">
                        <div class="drop-icon"><span class="material-icons-outlined">upload_file</span></div>
                        <h3>Drop your bank statements here</h3>
                        <p>Supports PDF files up to 10MB</p>
                        <div class="drop-btns">
                            <button class="btn-browse" onclick="document.getElementById('pdfFileInput').click()">
                                <span class="material-icons-outlined" style="font-size:16px">folder_open</span> Browse Files
                            </button>
                            <input type="file" id="pdfFileInput" accept=".pdf" style="display:none" onchange="processPdfFile(this.files[0])">
                        </div>
                    </div>
                </div>
                <div class="import-right">
                    <div class="import-info-card">
                        <div class="info-card-icon"><span class="material-icons-outlined">smart_toy</span></div>
                        <h4>Automatic Extraction</h4>
                        <p>SpendWise AI automatically identifies merchants, dates, and amounts from your documents. No manual entry.</p>
                        <div class="info-card-tags">
                            <span class="info-tag">● MULTI-CURRENCY SUPPORT</span>
                            <span class="info-tag">● CATEGORIZATION AI</span>
                        </div>
                    </div>
                    <div class="import-info-card dark">
                        <div class="info-card-icon"><span class="material-icons-outlined">security</span></div>
                        <h4>Bank-Grade Security</h4>
                        <p>All documents are parsed locally in your browser. We never store raw document files.</p>
                    </div>
                </div>
            </div>
            <div class="import-features">
                <div class="import-feature">
                    <div class="feature-icon"><span class="material-icons-outlined">article</span></div>
                    <h4>Bank Statements</h4>
                    <p>Upload monthly statements from Chase, Wells Fargo, Amex, and 100+ other institutions.</p>
                </div>
                <div class="import-feature">
                    <div class="feature-icon"><span class="material-icons-outlined">receipt_long</span></div>
                    <h4>Digital Receipts</h4>
                    <p>Drag in PDF invoices from Amazon or Uber for instant expense logging.</p>
                </div>
                <div class="import-feature">
                    <div class="feature-icon"><span class="material-icons-outlined">photo_camera</span></div>
                    <h4>Scanned Documents</h4>
                    <p>Text-based PDFs are parsed with high accuracy. Scanned images need text extraction tools first.</p>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeImportModal(); });
}

function handlePdfDrop(event) {
    event.preventDefault();
    document.getElementById('dropZone')?.classList.remove('dragover');
    processPdfFile(event.dataTransfer.files[0]);
}

async function processPdfFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')
        return showToast('Please upload a PDF file', 'error');
    if (file.size > 10 * 1024 * 1024)
        return showToast('File must be under 10MB', 'error');

    const dz = document.getElementById('dropZone');
    if (dz) dz.innerHTML = `<div class="drop-icon"><span class="spinner" style="width:40px;height:40px;border-width:3px"></span></div><h3>Extracting transactions…</h3><p>Analysing your bank statement</p>`;

    try {
        if (typeof pdfjsLib === 'undefined') throw new Error('PDF reader not available. Please refresh the page.');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const text = await extractTextFromPdf(file);
        const parsed = parseTransactionsFromText(text);
        if (!parsed.length) throw new Error('No transactions found. Make sure this is a text-based PDF bank statement, not a scanned image.');
        renderReviewTable(parsed);
    } catch (err) {
        showToast(err.message, 'error');
        showImportModal();
    }
}

async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const rowMap = {};
        for (const item of content.items) {
            if (!item.str || !item.str.trim()) continue;
            const y = Math.round(item.transform[5]);
            if (!rowMap[y]) rowMap[y] = [];
            rowMap[y].push({ x: item.transform[4], text: item.str });
        }
        const ys = Object.keys(rowMap).map(Number).sort((a, b) => b - a);
        for (const y of ys) {
            const row = rowMap[y].sort((a, b) => a.x - b.x);
            fullText += row.map(r => r.text).join('  ') + '\n';
        }
        fullText += '\n';
    }
    return fullText;
}

function parseTransactionsFromText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const results = [];
    const datePats = [
        /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
        /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/,
        /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{2,4})\b/i,
        /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})\b/i,
    ];
    const skipPat = /^(date|description|merchant|amount|balance|debit|credit|transaction|account|statement|opening|closing|total|particulars|narration|chq|ref\.?\s*no|value\s*dt|sr\.?\s*no|sl\.?\s*no|withdrawl|withdrawal|deposit|cheque)/i;
    const amountPat = /([(\u2212\-]?[\u20B9$]?\s*\d{1,6}(?:,\d{3})*\.\d{2}[)]?)/g;
    function getDateResult(line) {
        for (const pat of datePats) { const m = line.match(pat); if (m) return { str: m[1], match: m }; }
        return null;
    }
    function hasDate(line) { return !!getDateResult(line); }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (skipPat.test(line)) continue;

        const dateResult = getDateResult(line);
        if (!dateResult) continue;

        const amountMatches = [...line.matchAll(amountPat)];
        if (!amountMatches.length) continue;

        // Second-to-last amount = debit/credit; last = running balance
        const rawAmt = (amountMatches.length >= 2
            ? amountMatches[amountMatches.length - 2]
            : amountMatches[amountMatches.length - 1])[1].trim();
        const isNeg = rawAmt.startsWith('(') || rawAmt.startsWith('-') || rawAmt.startsWith('\u2212');
        const absVal = parseFloat(rawAmt.replace(/[\u20B9$,\s()\u2212\-]/g, ''));
        if (isNaN(absVal) || absVal === 0) continue;
        const amount = isNeg ? -absVal : absVal;

        // --- Detect transaction type & extract clean name from UPI/NEFT ref ---
        let rawDesc = line.replace(dateResult.match[0], '');
        amountMatches.forEach(m => { rawDesc = rawDesc.replace(m[0], ''); });
        // Strip trailing balance indicator like "Cr" or "Dr" only when preceded by whitespace
        rawDesc = rawDesc.replace(/\s+(Cr|Dr)\.?\s*$/i, '').replace(/\s+/g, ' ').trim();

        let txType = 'withdrawal'; // default
        let desc = rawDesc;

        // UPI format: UPIXX/REFNUM/DR/NAME/BANK/... or /CR/NAME/...
        const upiMatch = rawDesc.match(/\/(?:DR|CR)\/([^\/\s@][^\/]*?)(?:\/|\s*$)/i);
        const typeMatch = rawDesc.match(/\/(DR|CR)\//i);
        if (typeMatch) {
            txType = typeMatch[1].toUpperCase() === 'CR' ? 'deposit' : 'withdrawal';
        }
        if (upiMatch) {
            // Clean name: remove underscores, trailing numbers, email-like strings
            desc = upiMatch[1].replace(/[_]/g, ' ').replace(/\d{6,}/g, '').replace(/[@\.][\w\.]+/g, '').trim();
        } else {
            // Non-UPI: general cleanup (don't strip /DR/ /CR/ since already extracted)
            desc = rawDesc
                .replace(/\b\d{8,}\b/g, '')   // long ref numbers
                .replace(/[|*#_]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            desc = desc.replace(/^(debit|credit|purchase|payment|pos|atm|ach|upi|neft|imps|rtgs)\s*/i, '').trim();
        }

        // If desc still short, look AHEAD up to 3 lines for particulars
        if (desc.length < 3) {
            for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
                const next = lines[j].trim();
                if (!next || skipPat.test(next) || hasDate(next)) break;
                const nextAmts = [...next.matchAll(amountPat)];
                const nextNoAmt = next.replace(amountPat, '').replace(/\s/g, '');
                if (nextAmts.length && nextNoAmt.length < 4) continue;
                // Try UPI extraction on next line too
                const nextUpi = next.match(/\/(?:DR|CR)\/([^\/\s@][^\/]*?)(?:\/|\s*$)/i);
                if (nextUpi) { desc = nextUpi[1].replace(/[_]/g, ' ').replace(/\d{6,}/g, '').replace(/[@\.][\w\.]+/g, '').trim(); break; }
                const candidate = next.replace(amountPat, '').replace(/\b\d{8,}\b/g, '').replace(/[|*#_]/g, '').replace(/\s+/g, ' ').trim();
                if (candidate.length >= 2) { desc = candidate; break; }
            }
        }

        // Still empty — look BEHIND
        if (desc.length < 3 && i > 0) {
            const prev = lines[i - 1].trim();
            if (prev && !skipPat.test(prev) && !hasDate(prev)) {
                const prevAmts = [...prev.matchAll(amountPat)];
                if (!prevAmts.length) desc = prev.replace(/[|*#_]/g, '').replace(/\s+/g, ' ').trim();
            }
        }

        if (!desc || desc.length < 2) desc = 'Bank Transaction';

        // Set correct sign: deposit = positive income, withdrawal = negative expense
        const finalAmount = txType === 'deposit' ? absVal : -absVal;

        const cat = autoCategorize(desc);
        const meta = getCatMeta(cat);
        results.push({ name: desc.slice(0, 80), date: formatImportDate(dateResult.str), amount: finalAmount, txType, cat, catClass: meta.catClass, icon: meta.icon, time: 'Imported', method: 'Bank Import' });
    }

    const seen = new Set();
    return results.filter(tx => {
        const k = `${tx.date}|${tx.name}|${tx.amount}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
    });
}

function autoCategorize(desc) {
    const d = desc.toLowerCase();
    if (/uber|lyft|taxi|metro|bus|train|transit|fuel|petrol|shell|bp |chevron|exxon/.test(d)) return 'Transport';
    if (/netflix|spotify|hulu|amazon prime|disney\+|youtube premium|apple tv|apple music|steam|game/.test(d)) return 'Entertainment';
    if (/restaurant|cafe|coffee|starbucks|mcdonald|kfc|pizza|burger|sushi|grubhub|doordash|ubereats|dunkin/.test(d)) return 'Food';
    if (/walmart|target|costco|kroger|grocery|supermarket|whole foods|trader joe|safeway|publix|aldi/.test(d)) return 'Groceries';
    if (/rent|mortgage|landlord|lease/.test(d)) return 'Housing';
    if (/electricity|water bill|gas bill|internet|phone bill|at&t|verizon|comcast|t-mobile/.test(d)) return 'Utilities';
    if (/gym|fitness|medical|doctor|hospital|pharmacy|cvs|walgreens|insurance/.test(d)) return 'Health';
    if (/salary|payroll|direct deposit|paycheck|dividend|refund|tax refund|zelle from|venmo from/.test(d)) return 'Income';
    return 'Other';
}

function getCatMeta(cat) {
    const map = {
        'Transport':     { catClass:'transport',     icon:'local_taxi' },
        'Entertainment': { catClass:'entertainment', icon:'movie' },
        'Food':          { catClass:'food',          icon:'restaurant' },
        'Groceries':     { catClass:'groceries',     icon:'shopping_cart' },
        'Housing':       { catClass:'housing',       icon:'home' },
        'Utilities':     { catClass:'utilities',     icon:'bolt' },
        'Health':        { catClass:'health',        icon:'favorite' },
        'Income':        { catClass:'income',        icon:'payments' },
        'Other':         { catClass:'groceries',     icon:'receipt' },
    };
    return map[cat] || map['Other'];
}

function formatImportDate(s) {
    try {
        const d = new Date(s);
        if (!isNaN(d)) {
            const m = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        }
    } catch(e) {}
    return s;
}

function renderReviewTable(parsed) {
    const modal = document.getElementById('importModal');
    if (!modal) return;
    const cats = ['Food','Transport','Entertainment','Groceries','Housing','Utilities','Health','Income','Other'];
    const rows = parsed.map((tx, i) => `
        <tr id="rr${i}">
            <td><input class="review-input" type="text" value="${escHtml(tx.date)}" placeholder="Date"></td>
            <td><input class="review-input desc-inp" type="text" value="${escHtml(tx.name)}" placeholder="Description"></td>
            <td style="text-align:center">
                <div style="font-size:10px;font-weight:700;letter-spacing:.5px;margin-bottom:3px;color:${tx.txType==='deposit'?'#10b981':'#ef4444'};background:${tx.txType==='deposit'?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'};padding:2px 6px;border-radius:20px;display:inline-block">${tx.txType==='deposit'?'DEPOSIT':'WITHDRAWAL'}</div>
                <input class="review-input amt-inp" type="number" step="0.01" value="${tx.amount.toFixed(2)}" style="color:${tx.txType==='deposit'?'#10b981':'#ef4444'};font-weight:700">
            </td>
            <td><select class="review-select">${cats.map(c=>`<option value="${c}"${c===tx.cat?' selected':''}>${c}</option>`).join('')}</select></td>
            <td><input class="review-input" type="text" value="${escHtml(tx.method)}"></td>
            <td><button class="row-del-btn" onclick="removeReviewRow(this)" title="Remove"><span class="material-icons-outlined" style="font-size:16px">delete_outline</span></button></td>
        </tr>`).join('');

    modal.innerHTML = `
        <button class="import-close" onclick="closeImportModal()"><span class="material-icons-outlined">close</span></button>
        <div class="import-modal-header">
            <div class="ai-badge success-badge"><span class="material-icons-outlined" style="font-size:13px">check_circle</span> EXTRACTION COMPLETE</div>
            <h1>Review Transactions</h1>
            <p class="import-subtitle">Review and edit the extracted data. Click any cell to edit, delete rows you don't need, then confirm.</p>
        </div>
        <div class="review-table-wrap">
            <table class="review-table">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th><th>Method</th><th></th></tr></thead>
                <tbody id="reviewTbody">${rows}</tbody>
            </table>
        </div>
        <div class="import-actions">
            <button class="btn-add-row" onclick="addReviewRow()"><span class="material-icons-outlined" style="font-size:16px">add</span> Add Row</button>
            <div style="flex:1"></div>
            <button class="btn-back-import" onclick="showImportModal()"><span class="material-icons-outlined" style="font-size:16px">arrow_back</span> Back</button>
            <button class="btn-confirm-import" id="confirmImportBtn" onclick="confirmImport()">
                <span class="material-icons-outlined" style="font-size:16px">check</span> Confirm &amp; Import (<span id="importCount">${parsed.length}</span>)
            </button>
        </div>`;
}

function addReviewRow() {
    const tbody = document.getElementById('reviewTbody');
    if (!tbody) return;
    const cats = ['Food','Transport','Entertainment','Groceries','Housing','Utilities','Health','Income','Other'];
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input class="review-input" type="text" placeholder="MM/DD/YYYY"></td>
        <td><input class="review-input desc-inp" type="text" placeholder="Description"></td>
        <td><input class="review-input amt-inp" type="number" step="0.01" placeholder="0.00"></td>
        <td><select class="review-select">${cats.map(c=>`<option>${c}</option>`).join('')}</select></td>
        <td><input class="review-input" type="text" value="Manual"></td>
        <td><button class="row-del-btn" onclick="removeReviewRow(this)"><span class="material-icons-outlined" style="font-size:16px">delete_outline</span></button></td>`;
    tbody.appendChild(tr);
    updateImportCount();
}

function removeReviewRow(btn) {
    btn.closest('tr').remove();
    updateImportCount();
}

function updateImportCount() {
    const el = document.getElementById('importCount');
    const tbody = document.getElementById('reviewTbody');
    if (el && tbody) el.textContent = tbody.querySelectorAll('tr').length;
}

async function confirmImport() {
    const tbody = document.getElementById('reviewTbody');
    if (!tbody) return;
    const rows = [...tbody.querySelectorAll('tr')];
    if (!rows.length) return showToast('No transactions to import', 'error');

    const toSave = rows.map(row => {
        const inputs = row.querySelectorAll('input');
        const sel = row.querySelector('select');
        const cat = sel?.value || 'Other';
        const meta = getCatMeta(cat);
        return {
            name:     inputs[1]?.value.trim() || 'Transaction',
            date:     inputs[0]?.value.trim() || new Date().toLocaleDateString(),
            amount:   parseFloat(inputs[2]?.value) || 0,
            cat, catClass: meta.catClass, icon: meta.icon,
            time:     'Imported',
            method:   inputs[3]?.value.trim() || 'Bank Import',
        };
    }).filter(tx => tx.name);

    const btn = document.getElementById('confirmImportBtn');
    setBtnLoading(btn, true);
    try {
        await api('transactions', { transactions: toSave });
        toSave.slice().reverse().forEach(tx => transactions.unshift(tx));
        closeImportModal();
        showToast(`${toSave.length} transaction${toSave.length > 1 ? 's' : ''} imported successfully!`);
        if (currentPage === 'transactions') loadUserTransactions('fullTxList', null);
        else if (currentPage === 'dashboard') loadUserTransactions('recentTxList', 5);
    } catch (err) {
        showToast(err.message, 'error');
        setBtnLoading(btn, false);
    }
}

async function loadUserTransactions(containerId, limit) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<li class="tx-loading"><span class="spinner"></span> Loading transactions…</li>';
    try {
        const data = await api('transactions', null, 'GET');
        let txs = data.transactions || [];
        if (limit) txs = txs.slice(0, limit);
        if (txs.length > 0) renderTransactions(containerId, txs);
        else renderTransactions(containerId, limit ? transactions.slice(0, limit) : transactions);
    } catch {
        renderTransactions(containerId, limit ? transactions.slice(0, limit) : transactions);
    }
}

