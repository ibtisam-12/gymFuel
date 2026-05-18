const mockMessaging = jest.fn(() => ({
  requestPermission: jest.fn(async () => mockMessaging.AuthorizationStatus.AUTHORIZED),
  registerDeviceForRemoteMessages: jest.fn(async () => undefined),
  getToken: jest.fn(async () => 'test-fcm-token'),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
}));

mockMessaging.AuthorizationStatus = {
  AUTHORIZED: 1,
  DENIED: 0,
  NOT_DETERMINED: -1,
  PROVISIONAL: 2,
};

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: mockMessaging,
  FirebaseMessagingTypes: {},
}));

jest.mock('@react-native-firebase/app', () => ({}));
