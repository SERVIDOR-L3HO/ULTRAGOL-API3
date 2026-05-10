const admin = require('firebase-admin');

let initialized = false;

function getFirebaseAdmin() {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.warn('⚠️ FIREBASE_PROJECT_ID no configurado - Firebase Auth desactivado');
      return null;
    }
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId
      });
      initialized = true;
      console.log('✅ Firebase Admin inicializado');
    } catch (err) {
      if (err.code === 'app/duplicate-app') {
        initialized = true;
      } else {
        console.error('❌ Error inicializando Firebase Admin:', err.message);
        return null;
      }
    }
  }
  return admin;
}

async function verifyFirebaseToken(idToken) {
  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) return null;
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    console.error('❌ Token Firebase inválido:', err.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin, verifyFirebaseToken };
