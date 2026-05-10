const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_VERCEL = !!process.env.VERCEL;

const LOCAL_FILE = IS_VERCEL
  ? '/tmp/apikeys.json'
  : path.join(__dirname, '../../data/apikeys.json');

let memoryStore = null;

function ensureFile() {
  if (IS_VERCEL) {
    if (!fs.existsSync(LOCAL_FILE)) {
      const initial = _loadFromEnv();
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(initial), 'utf8');
      memoryStore = initial;
    }
    return;
  }
  const dir = path.dirname(LOCAL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LOCAL_FILE)) fs.writeFileSync(LOCAL_FILE, JSON.stringify([]), 'utf8');
}

function _loadFromEnv() {
  try {
    const raw = process.env.API_KEYS_JSON;
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function readKeys() {
  if (IS_VERCEL && memoryStore !== null) return memoryStore;
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    if (IS_VERCEL) memoryStore = data;
    return data;
  } catch {
    return [];
  }
}

function writeKeys(keys) {
  if (IS_VERCEL) {
    memoryStore = keys;
    try { fs.writeFileSync(LOCAL_FILE, JSON.stringify(keys, null, 2), 'utf8'); } catch {}
    return;
  }
  ensureFile();
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(keys, null, 2), 'utf8');
}

function getAllKeys() {
  return readKeys().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createKey(name) {
  const keys = readKeys();
  const rawKey = 'l3ho_' + crypto.randomBytes(24).toString('hex');
  const keyDisplay = rawKey.substring(0, 12) + '...';
  const entry = {
    id: crypto.randomUUID(),
    name: name.trim(),
    key: rawKey,
    keyDisplay,
    active: true,
    requests: 0,
    createdAt: new Date().toISOString(),
    lastUsed: null
  };
  keys.push(entry);
  writeKeys(keys);
  return entry;
}

function findKey(rawKey) {
  return readKeys().find(k => k.key === rawKey && k.active) || null;
}

function getKeyById(id) {
  return readKeys().find(k => k.id === id) || null;
}

function toggleKey(id) {
  const keys = readKeys();
  const idx = keys.findIndex(k => k.id === id);
  if (idx === -1) return null;
  keys[idx].active = !keys[idx].active;
  writeKeys(keys);
  return keys[idx];
}

function deleteKey(id) {
  const keys = readKeys();
  const idx = keys.findIndex(k => k.id === id);
  if (idx === -1) return false;
  keys.splice(idx, 1);
  writeKeys(keys);
  return true;
}

function incrementRequests(rawKey) {
  const keys = readKeys();
  const idx = keys.findIndex(k => k.key === rawKey);
  if (idx !== -1) {
    keys[idx].requests = (keys[idx].requests || 0) + 1;
    keys[idx].lastUsed = new Date().toISOString();
    writeKeys(keys);
  }
}

module.exports = { getAllKeys, createKey, findKey, getKeyById, toggleKey, deleteKey, incrementRequests, IS_VERCEL };
