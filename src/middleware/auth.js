const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('admin123', 12);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

const sessionConfig = session({
  secret: SESSION_SECRET,
  name: 'l3ho_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Límite de solicitudes excedido. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:", "http:"],
      childSrc: ["'self'", "https:", "http:"],
      frameAncestors: ["*"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  xFrameOptions: false
});

function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
  if (req.method === 'GET') {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }
  
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }
  next();
}

function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    req.session.lastActivity = Date.now();
    return next();
  }
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  res.redirect('/login');
}

function isNotAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  next();
}

async function validatePassword(password) {
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

function createSession(req, userInfo = {}) {
  req.session.authenticated = true;
  req.session.user = {
    loginTime: Date.now(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...userInfo
  };
  req.session.csrfToken = generateCSRFToken();
}

function destroySession(req, callback) {
  req.session.destroy(callback);
}

function sessionTimeout(timeout = 30 * 60 * 1000) {
  return (req, res, next) => {
    if (req.session && req.session.authenticated) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || req.session.user?.loginTime || now;
      
      if (now - lastActivity > timeout) {
        return req.session.destroy(() => {
          if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Sesión expirada' });
          }
          res.redirect('/login?expired=1');
        });
      }
    }
    next();
  };
}

function logAccess(req, res, next) {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);
  next();
}

module.exports = {
  sessionConfig,
  loginLimiter,
  apiLimiter,
  securityHeaders,
  csrfProtection,
  isAuthenticated,
  isNotAuthenticated,
  validatePassword,
  createSession,
  destroySession,
  sessionTimeout,
  logAccess,
  generateCSRFToken,
  ADMIN_PASSWORD_HASH
};