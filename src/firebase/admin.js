const admin = require('firebase-admin');

let db = null;
let initialized = false;

const initFirebase = () => {
  if (initialized) return;

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON no configurado — API key auth desactivada');
      return;
    }
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'apik-9510b'
    });
    db = admin.firestore();
    initialized = true;
    console.log('✅ Firebase Admin inicializado');
  } catch (err) {
    console.error('❌ Error inicializando Firebase Admin:', err.message);
  }
};

const getDb = () => {
  if (!initialized) initFirebase();
  return db;
};

const verifyIdToken = async (idToken) => {
  if (!initialized) initFirebase();
  if (!initialized) throw new Error('Firebase no inicializado');
  return admin.auth().verifyIdToken(idToken);
};

const getFieldValue = () => {
  return admin.firestore.FieldValue;
};

module.exports = { initFirebase, getDb, verifyIdToken, getFieldValue };
