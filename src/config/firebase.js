const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully via FIREBASE_SERVICE_ACCOUNT.');
  } else {
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
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high',
          visibility: 'public'
        }
      },
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
