import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import { notificationsApi } from './backend';

const getMessageTitle = (message: FirebaseMessagingTypes.RemoteMessage) =>
  message.notification?.title || message.data?.title?.toString() || 'GymFuel reminder';

const getMessageBody = (message: FirebaseMessagingTypes.RemoteMessage) =>
  message.notification?.body || message.data?.body?.toString() || 'Time to update your progress.';

const showFcmHealthToast = (type: 'success' | 'error' | 'info', text1: string, text2?: string) => {
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime: 4500,
  });

};

export interface FcmHealthCheckResult {
  ok: boolean;
  permissionGranted: boolean;
  backendRegistered: boolean;
  token: string | null;
  message: string;
}

const requestNotificationPermission = async (showToast = true) => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const currentStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (currentStatus) {
      if (showToast) {
        showFcmHealthToast('info', 'Notification permission', 'Already allowed.');
      }
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (showToast) {
      showFcmHealthToast('info', 'Notification permission', result);
    }

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (Platform.OS === 'android') {
    if (showToast) {
      showFcmHealthToast(
        'info',
        'Notification permission',
        `Android ${Platform.Version} does not show the runtime prompt.`,
      );
    }
    return true;
  }

  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

export const checkFcmHealth = async (showToast = true): Promise<FcmHealthCheckResult> => {
  const permissionGranted = await requestNotificationPermission(showToast);

  if (!permissionGranted) {
    const message = 'Notification permission was not granted.';
    if (showToast) {
      showFcmHealthToast('error', 'FCM check failed', message);
    }
    return {
      ok: false,
      permissionGranted: false,
      backendRegistered: false,
      token: null,
      message,
    };
  }

  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();

  if (!token) {
    const message = 'No device token received.';
    if (showToast) {
      showFcmHealthToast('error', 'FCM check failed', message);
    }
    return {
      ok: false,
      permissionGranted: true,
      backendRegistered: false,
      token: null,
      message,
    };
  }

  const response = await notificationsApi.registerDevice({
    token,
    platform: Platform.OS,
  });

  if (!response.success) {
    const message = response.error || 'Backend device registration failed.';
    console.warn('FCM device registration failed:', response.error);
    if (showToast) {
      showFcmHealthToast('error', 'FCM token created', message);
    }
    return {
      ok: false,
      permissionGranted: true,
      backendRegistered: false,
      token,
      message,
    };
  }

  const shortToken = `${token.slice(0, 12)}...${token.slice(-6)}`;
  const message = `Token ${shortToken} registered with backend.`;
  console.log('FCM health check passed:', {
    platform: Platform.OS,
    token: shortToken,
    status: response.ResponseCode,
  });
  // if (showToast) {
  //   showFcmHealthToast('success', 'FCM is running', message);
  // }

  return {
    ok: true,
    permissionGranted: true,
    backendRegistered: true,
    token,
    message,
  };
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
        const health = await checkFcmHealth();
        if (!health.permissionGranted || !mounted) {
          return;
        }

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
        showFcmHealthToast(
          'error',
          'FCM check failed',
          error instanceof Error ? error.message : 'Push notification setup failed.',
        );
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
