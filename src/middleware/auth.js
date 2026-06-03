const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://www.gstatic.com", "https://www.googletagmanager.com"],
      connectSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'", "https:", "http:"],
      childSrc: ["'self'", "https:", "http:", "blob:"],
      frameAncestors: ["*"],
      mediaSrc: ["'self'", "https:", "http:", "blob:", "data:"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  xFrameOptions: false
});

module.exports = {
  apiLimiter,
  securityHeaders
};
