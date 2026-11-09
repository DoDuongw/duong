import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerDevice } from './endpoints';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getPushTokenAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12659c',
      });
      await Notifications.setNotificationChannelAsync('med-reminders', {
        name: 'Nhắc uống thuốc',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12659c',
      });
      await Notifications.setNotificationChannelAsync('med-wellness', {
        name: 'Hỏi thăm sức khỏe',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#12659c',
      });
    }

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    const isExpoGo =
      (Constants as any)?.appOwnership === 'expo' ||
      String((Constants as any)?.executionEnvironment || '').toLowerCase().includes('store');

    const getExpoToken = async (): Promise<string | null> => {
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        return tokenResult.data ? String(tokenResult.data) : null;
      } catch {
        return null;
      }
    };

    const getNativeToken = async (): Promise<string | null> => {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        return deviceToken?.data ? String(deviceToken.data) : null;
      } catch {
        return null;
      }
    };

    // Expo Go + backend hỗ trợ Expo Push Service: ưu tiên Expo push token.
    // Dev/EAS build có thể dùng native/FCM token (backend vẫn hỗ trợ hybrid).
    if (isExpoGo) {
      return (await getExpoToken()) ?? (await getNativeToken());
    }
    return (await getNativeToken()) ?? (await getExpoToken());
  } catch {
    return null;
  }
}

export async function registerDevicePushToken(): Promise<void> {
  const token = await getPushTokenAsync();
  if (!token) return;
  const platform: 'android' | 'ios' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  try {
    await registerDevice({ fcmToken: token, platform });
  } catch {
    // best-effort: do not block app usage
  }
}

// Backward-compatible alias
export const registerForPushNotificationsAsync = getPushTokenAsync;
