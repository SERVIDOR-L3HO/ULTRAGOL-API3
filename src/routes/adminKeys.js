const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb, verifyIdToken, getFieldValue } = require('../firebase/admin');

const ALLOWED_EMAIL = 'santiagoeduardo331@gmail.com';

const requireFirebaseAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await verifyIdToken(idToken);
    if (decoded.email !== ALLOWED_EMAIL) {
      return res.status(403).json({ error: 'Acceso denegado. Email no autorizado.' });
    }
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

router.get('/keys', requireFirebaseAdmin, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Firebase no inicializado' });
  try {
    const snapshot = await db.collection('apiKeys').orderBy('createdAt', 'desc').get();
    const keys = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      keyDisplay: doc.data().keyDisplay,
      active: doc.data().active,
      requests: doc.data().requests || 0,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      lastUsed: doc.data().lastUsed?.toDate?.() || doc.data().lastUsed || null
    }));
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/keys', requireFirebaseAdmin, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Firebase no inicializado' });
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la API key es requerido' });
  }
  try {
    const rawKey = 'l3ho_' + crypto.randomBytes(24).toString('hex');
    const keyDisplay = rawKey.substring(0, 12) + '...';
    const docRef = await db.collection('apiKeys').add({
      name: name.trim(),
      key: rawKey,
      keyDisplay,
      active: true,
      requests: 0,
      createdAt: new Date(),
      lastUsed: null,
      createdBy: req.adminUser.email
    });
    res.json({
      success: true,
      id: docRef.id,
      key: rawKey,
      keyDisplay,
      name: name.trim(),
      message: 'Guarda esta key, no se mostrará de nuevo.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/keys/:id', requireFirebaseAdmin, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Firebase no inicializado' });
  try {
    const docRef = db.collection('apiKeys').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'API key no encontrada' });
    const newActive = !doc.data().active;
    await docRef.update({ active: newActive });
    res.json({ success: true, active: newActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:id', requireFirebaseAdmin, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Firebase no inicializado' });
  try {
    await db.collection('apiKeys').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
