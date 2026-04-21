import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native Android/iOS devices.');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permissions denied');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token:', token.value);
      const jwt = localStorage.getItem('mtto_token');
      if (jwt) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
        await fetch(`${apiUrl}/api/users/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({ fcmToken: token.value })
        });
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on push registration: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

  } catch (error) {
    console.error('Push notification setup error:', error);
  }
};
