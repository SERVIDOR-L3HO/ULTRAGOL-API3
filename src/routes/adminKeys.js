const express = require('express');
const router = express.Router();
const store = require('../storage/firestoreKeyStore');

router.get('/status', (req, res) => {
  res.json({ storage: 'firestore', project: 'apik-9510b' });
});

router.post('/invalidate-cache', (req, res) => {
  store.invalidateCache();
  res.json({ success: true, message: 'Cache invalidado' });
});

module.exports = router;
