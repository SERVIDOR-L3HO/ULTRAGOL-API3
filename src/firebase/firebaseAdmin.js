const https = require('https');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let cachedCerts = null;
let certsExpiry = 0;

function fetchGoogleCerts() {
  return new Promise((resolve, reject) => {
    if (cachedCerts && Date.now() < certsExpiry) {
      return resolve(cachedCerts);
    }
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          cachedCerts = JSON.parse(data);
          const cacheControl = res.headers['cache-control'] || '';
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 3600;
          certsExpiry = Date.now() + maxAge * 1000;
          resolve(cachedCerts);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verifyFirebaseToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.warn('⚠️ FIREBASE_PROJECT_ID no configurado');
    return null;
  }
  try {
    const header = JSON.parse(Buffer.from(idToken.split('.')[0], 'base64url').toString());
    const certs = await fetchGoogleCerts();
    const cert = certs[header.kid];
    if (!cert) {
      console.error('❌ Certificado de Firebase no encontrado para kid:', header.kid);
      return null;
    }
    const decoded = jwt.verify(idToken, cert, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`
    });
    return decoded;
  } catch (err) {
    console.error('❌ Token Firebase inválido:', err.message);
    return null;
  }
}

module.exports = { verifyFirebaseToken };
