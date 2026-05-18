import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { notificationsApi } from './backend';

const getMessageTitle = (message: FirebaseMessagingTypes.RemoteMessage) =>
  message.notification?.title || message.data?.title?.toString() || 'GymFuel reminder';

const getMessageBody = (message: FirebaseMessagingTypes.RemoteMessage) =>
  message.notification?.body || message.data?.body?.toString() || 'Time to update your progress.';

const requestNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

const registerCurrentDevice = async () => {
  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();

  if (!token) {
    return null;
  }

  const response = await notificationsApi.registerDevice({
    token,
    platform: Platform.OS,
  });

  if (!response.success) {
    console.warn('FCM device registration failed:', response.error);
  }

  return token;
};

export const usePushNotifications = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let mounted = true;
    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeOpened: (() => void) | undefined;

    const setupPushNotifications = async () => {
      try {
        const permissionGranted = await requestNotificationPermission();
        if (!permissionGranted || !mounted) {
          return;
        }

        await registerCurrentDevice();

        unsubscribeTokenRefresh = messaging().onTokenRefresh(async token => {
          const response = await notificationsApi.registerDevice({
            token,
            platform: Platform.OS,
          });

          if (!response.success) {
            console.warn('FCM token refresh registration failed:', response.error);
          }
        });

        unsubscribeForeground = messaging().onMessage(async remoteMessage => {
          Toast.show({
            type: 'success',
            text1: getMessageTitle(remoteMessage),
            text2: getMessageBody(remoteMessage),
            visibilityTime: 4500,
          });
        });

        unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
          console.log('Notification opened:', remoteMessage.messageId);
        });

        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage) {
          console.log('Notification launched app:', initialMessage.messageId);
        }
      } catch (error) {
        console.warn('Push notification setup failed:', error);
      }
    };

    setupPushNotifications();

    return () => {
      mounted = false;
      unsubscribeTokenRefresh?.();
      unsubscribeForeground?.();
      unsubscribeOpened?.();
    };
  }, [enabled]);
};
