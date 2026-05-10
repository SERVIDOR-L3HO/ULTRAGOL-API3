const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_FILE = path.join(__dirname, '../../data/apikeys.json');

function ensureFile() {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify([]), 'utf8');
}

function readKeys() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeKeys(keys) {
  ensureFile();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
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

module.exports = { getAllKeys, createKey, findKey, getKeyById, toggleKey, deleteKey, incrementRequests };
