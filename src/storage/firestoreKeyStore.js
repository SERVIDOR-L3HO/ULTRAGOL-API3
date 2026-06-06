const axios = require('axios');
const crypto = require('crypto');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'apik-9510b';
const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/apikeys`;

let cache = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 1000;

function fromFirestore(doc) {
  const f = doc.fields || {};
  return {
    id: f.id?.stringValue || doc.name.split('/').pop(),
    docId: doc.name.split('/').pop(),
    name: f.name?.stringValue || '',
    key: f.key?.stringValue || '',
    keyDisplay: f.keyDisplay?.stringValue || '',
    active: f.active?.booleanValue ?? true,
    requests: parseInt(f.requests?.integerValue || '0', 10),
    createdAt: f.createdAt?.stringValue || new Date().toISOString(),
    lastUsed: f.lastUsed?.stringValue || null
  };
}

async function fetchAllKeys(force = false) {
  const now = Date.now();
  if (!force && cache && (now - lastFetch) < CACHE_TTL) return cache;
  try {
    const res = await axios.get(`${BASE_URL}?key=${WEB_API_KEY}`, { timeout: 5000 });
    const docs = res.data.documents || [];
    cache = docs.map(fromFirestore);
    lastFetch = now;
    return cache;
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      console.warn('⚠️  Firestore: reglas no configuradas aún — usando archivo local como respaldo');
    } else {
      console.error('Error leyendo keys de Firestore:', err.message);
    }
    return cache || [];
  }
}

function invalidateCache() {
  cache = null;
  lastFetch = 0;
}

async function getAllKeys() {
  const keys = await fetchAllKeys();
  return [...keys].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findKey(rawKey) {
  const keys = await fetchAllKeys();
  return keys.find(k => k.key === rawKey && k.active) || null;
}

async function incrementRequests(rawKey) {
  if (cache) {
    const idx = cache.findIndex(k => k.key === rawKey);
    if (idx !== -1) {
      cache[idx].requests = (cache[idx].requests || 0) + 1;
      cache[idx].lastUsed = new Date().toISOString();
    }
  }
}

module.exports = { getAllKeys, findKey, incrementRequests, invalidateCache, fetchAllKeys };
