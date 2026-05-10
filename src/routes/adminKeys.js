const express = require('express');
const router = express.Router();
const store = require('../storage/keyStore');

const requireAdminKey = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'ADMIN_API_KEY no configurada en el servidor' });
  }
  const provided = req.headers['x-admin-key'] || req.query.adminKey;
  if (!provided || provided !== adminKey) {
    return res.status(401).json({ error: 'API key de administrador inválida' });
  }
  next();
};

router.get('/keys', requireAdminKey, (req, res) => {
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

router.post('/keys', requireAdminKey, (req, res) => {
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

router.patch('/keys/:id', requireAdminKey, (req, res) => {
  try {
    const updated = store.toggleKey(req.params.id);
    if (!updated) return res.status(404).json({ error: 'API key no encontrada' });
    res.json({ success: true, active: updated.active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:id', requireAdminKey, (req, res) => {
  try {
    const deleted = store.deleteKey(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'API key no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
