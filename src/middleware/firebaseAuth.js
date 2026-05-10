const { verifyFirebaseToken } = require('../firebase/firebaseAdmin');
const { getKeyByValue, recordUsage } = require('../apiKeys');

const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL || 'Santiagoeduardo331@gmail.com').toLowerCase();

function requireFirebaseAuth(req, res, next) {
  if (req.session && req.session.firebaseAuthenticated) {
    return next();
  }
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }
  res.redirect('/login');
}

function requireAdminAuth(req, res, next) {
  if (req.session && req.session.firebaseAuthenticated && req.session.firebaseUser) {
    const email = (req.session.firebaseUser.email || '').toLowerCase();
    if (email === ALLOWED_EMAIL) {
      return next();
    }
    return res.status(403).json({ error: 'Acceso denegado. No eres el administrador.' });
  }
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión primero.' });
  }
  res.redirect('/login');
}

function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    const keyRecord = getKeyByValue(apiKey);
    if (keyRecord) {
      recordUsage(apiKey);
      req.apiKeyAuth = true;
      return next();
    }
    return res.status(401).json({ error: 'API key inválida o revocada.' });
  }
  if (req.session && req.session.firebaseAuthenticated) {
    return next();
  }
  return res.status(401).json({
    error: 'Autenticación requerida. Usa un API key (header X-Api-Key) o inicia sesión.',
    hint: 'Visita /login para iniciar sesión, o solicita una API key al administrador.'
  });
}

async function firebaseTokenLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Token de Firebase requerido' });
    }
    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    const userEmail = (decodedToken.email || '').toLowerCase();
    if (userEmail !== ALLOWED_EMAIL) {
      console.warn(`⛔ Acceso denegado para: ${userEmail}`);
      return res.status(403).json({ error: 'Acceso denegado. Este correo no tiene permiso para entrar.' });
    }
    req.session.firebaseAuthenticated = true;
    req.session.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email,
      picture: decodedToken.picture || null
    };
    console.log(`🔐 Login Firebase exitoso: ${decodedToken.email}`);
    res.json({ success: true, user: req.session.firebaseUser });
  } catch (err) {
    console.error('Error en login Firebase:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { requireFirebaseAuth, requireAdminAuth, apiKeyAuth, firebaseTokenLogin };
