const { getDb, getFieldValue } = require('../firebase/admin');

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/admin',
  '/l3ho-links',
  '/embed/l3ho-links',
  '/api',
];

const PUBLIC_PREFIXES = [
  '/public/',
  '/attached_assets/',
  '/auth/',
  '/api-admin/',
];

const apiKeyAuth = async (req, res, next) => {
  const reqPath = req.path;

  if (PUBLIC_PATHS.includes(reqPath)) return next();
  if (PUBLIC_PREFIXES.some(p => reqPath.startsWith(p))) return next();

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API Key requerida',
      message: 'Incluye tu API key en el header X-API-Key o como parámetro ?apiKey=TU_KEY',
      docs: 'Solicita tu API key en el panel de administración'
    });
  }

  const db = getDb();
  if (!db) {
    console.warn('⚠️ Firebase no inicializado, saltando validación de API key');
    return next();
  }

  try {
    const snapshot = await db.collection('apiKeys')
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        error: 'API Key inválida o desactivada',
        message: 'La API key proporcionada no es válida o ha sido revocada'
      });
    }

    const doc = snapshot.docs[0];
    const FieldValue = getFieldValue();
    doc.ref.update({
      requests: FieldValue.increment(1),
      lastUsed: new Date()
    }).catch(() => {});

    req.apiKeyInfo = { id: doc.id, ...doc.data() };
    next();
  } catch (err) {
    console.error('Error validando API key:', err.message);
    res.status(500).json({ error: 'Error interno validando API key' });
  }
};

module.exports = { apiKeyAuth };
