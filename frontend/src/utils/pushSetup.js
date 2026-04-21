import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native Android/iOS devices.');
    return;
  }

  try {
    // Basic permissions for Android 13+
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    // Also request local notification permissions for foreground heads-up
    await LocalNotifications.requestPermissions();

    // Create the default channel for Android
    await PushNotifications.createChannel({
      id: 'default',
      name: 'Default',
      description: 'Canal por defecto para notificaciones',
      importance: 5,
      visibility: 1,
      vibration: true
    });

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

    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received in foreground: ', notification);
      
      // Force a Local Notification so it appears even with the app open
      await LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title || 'Nueva Notificación',
            body: notification.body || '',
            id: new Date().getTime(),
            extra: notification.data
          }
        ]
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

  } catch (error) {
    console.error('Push notification setup error:', error);
  }
};
