const express = require('express');
const router = express.Router();
const store = require('../storage/keyStore');
const axios = require('axios');

const FIREBASE_WEB_API_KEY = 'AIzaSyCHAptclAjSVJP3iDNzqrLbs9bQ3272SrU';
const ALLOWED_EMAIL = 'santiagoeduardo331@gmail.com';

const requireFirebaseAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      { idToken },
      { timeout: 5000 }
    );
    const users = response.data.users;
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    const email = users[0].email;
    if (email !== ALLOWED_EMAIL) {
      return res.status(403).json({ error: `Acceso denegado para ${email}` });
    }
    req.adminEmail = email;
    next();
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return res.status(401).json({ error: `Autenticación fallida: ${msg}` });
  }
};

router.get('/keys', requireFirebaseAuth, (req, res) => {
  try {
    const keys = store.getAllKeys().map(k => ({
      id: k.id,
      name: k.name,
      keyDisplay: k.keyDisplay,
      active: k.active,
      requests: k.requests || 0,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed || null
    }));
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/keys', requireFirebaseAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la API key es requerido' });
  }
  try {
    const entry = store.createKey(name);
    res.json({
      success: true,
      id: entry.id,
      key: entry.key,
      keyDisplay: entry.keyDisplay,
      name: entry.name,
      message: 'Guarda esta key, no se mostrará de nuevo.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/keys/:id', requireFirebaseAuth, (req, res) => {
  try {
    const updated = store.toggleKey(req.params.id);
    if (!updated) return res.status(404).json({ error: 'API key no encontrada' });
    res.json({ success: true, active: updated.active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:id', requireFirebaseAuth, (req, res) => {
  try {
    const deleted = store.deleteKey(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'API key no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', requireFirebaseAuth, (req, res) => {
  const { IS_VERCEL } = require('../storage/keyStore');
  res.json({ isVercel: IS_VERCEL });
});

router.get('/export', requireFirebaseAuth, (req, res) => {
  try {
    const keys = store.getAllKeys();
    res.json({ API_KEYS_JSON: JSON.stringify(keys) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
