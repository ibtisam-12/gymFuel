import { Platform } from 'react-native';

/**
 * Backend host for local development.
 * - Android emulator: 10.0.2.2 → your PC localhost
 * - iOS simulator: localhost
 * - Physical device: set your PC's LAN IP (e.g. 192.168.1.5)
 */
const DEV_MACHINE_IP = '10.0.2.2';

const resolveDevHost = (): string => {
  if (Platform.OS === 'android') {
    return DEV_MACHINE_IP;
  }
  return 'localhost';
};

export const API_HOST = __DEV__ ? resolveDevHost() : 'api.gymfuel.pk';
export const API_BASE_URL = __DEV__
  ? `http://${API_HOST}:8000/api/v1`
  : `https://${API_HOST}/api/v1`;
export const WS_BASE_URL = __DEV__
  ? `ws://${API_HOST}:8000/ws`
  : `wss://${API_HOST}/ws`;
