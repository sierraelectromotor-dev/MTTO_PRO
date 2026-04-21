const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

try {
  const serviceAccountPath = path.join(__dirname, '..', '..', 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn('Firebase Admin SDK: serviceAccountKey.json not found. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Firebase Admin SDK Setup Error:', error);
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!initialized || !fcmToken) return false;
  try {
    const message = {
      notification: { title, body },
      data,
      token: fcmToken
    };
    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('Firebase Push Error:', error);
    return false;
  }
};

module.exports = { admin, sendPushNotification, initialized };
