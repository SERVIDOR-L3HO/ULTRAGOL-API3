const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'api-keys.json');

function loadKeys() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify({ keys: [] }));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error cargando API keys:', err.message);
    return { keys: [] };
  }
}

function saveKeys(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error guardando API keys:', err.message);
  }
}

function generateApiKey() {
  return 'l3ho_' + crypto.randomBytes(24).toString('hex');
}

function createKey(name, description = '') {
  const data = loadKeys();
  const key = {
    id: crypto.randomBytes(8).toString('hex'),
    key: generateApiKey(),
    name: name || 'Sin nombre',
    description,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    usageCount: 0,
    active: true
  };
  data.keys.push(key);
  saveKeys(data);
  return key;
}

function getAllKeys() {
  const data = loadKeys();
  return data.keys;
}

function getKeyByValue(apiKey) {
  const data = loadKeys();
  return data.keys.find(k => k.key === apiKey && k.active);
}

function deleteKey(id) {
  const data = loadKeys();
  const idx = data.keys.findIndex(k => k.id === id);
  if (idx === -1) return false;
  data.keys.splice(idx, 1);
  saveKeys(data);
  return true;
}

function revokeKey(id) {
  const data = loadKeys();
  const key = data.keys.find(k => k.id === id);
  if (!key) return false;
  key.active = false;
  saveKeys(data);
  return true;
}

function recordUsage(apiKey) {
  const data = loadKeys();
  const key = data.keys.find(k => k.key === apiKey);
  if (key) {
    key.lastUsed = new Date().toISOString();
    key.usageCount = (key.usageCount || 0) + 1;
    saveKeys(data);
  }
}

module.exports = { createKey, getAllKeys, getKeyByValue, deleteKey, revokeKey, recordUsage };
