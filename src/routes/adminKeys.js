const express = require('express');
const router = express.Router();
const store = require('../storage/keyStore');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'No autenticado' });
}

router.get('/status', (req, res) => {
  res.json({ storage: 'local', authenticated: !!(req.session && req.session.isAdmin) });
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado' });
  }
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Contraseña incorrecta' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get('/check-auth', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

router.get('/keys', requireAdmin, (req, res) => {
  try {
    const keys = store.getAllKeys();
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/keys', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  try {
    const entry = store.createKey(name);
    res.json({ success: true, key: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/keys/:id/toggle', requireAdmin, (req, res) => {
  try {
    const updated = store.toggleKey(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Key no encontrada' });
    res.json({ success: true, key: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:id', requireAdmin, (req, res) => {
  try {
    const deleted = store.deleteKey(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Key no encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invalidate-cache', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Cache invalidado' });
});

module.exports = router;
