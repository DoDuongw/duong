import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerDevice } from './endpoints';
import { disableWebPush, getCurrentWebPushToken, registerWebPush } from './webPush';
import type { WebPushOptions } from './webPush.types';
import { WELLNESS_CATEGORY_ID, WELLNESS_QUICK_ANSWERS } from '../utils/wellness';

type PushPlatform = 'android' | 'ios' | 'web';

export interface PushRegistrationResult {
  token: string | null;
  platform: PushPlatform;
  message?: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Tạo channel Android và category có nút thao tác nhanh. Gọi sớm lúc app khởi
 * động để banner hỏi thăm sức khỏe hiện đúng kiểu heads-up và có 3 lựa chọn.
 */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12659c',
      });
      await Notifications.setNotificationChannelAsync('med-reminders', {
        name: 'Nhắc uống thuốc',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12659c',
      });
      // Channel mới: Android giữ nguyên importance/sound của channel đã tạo,
      // nên đổi id để bản cài cũ vẫn nhận được cấu hình heads-up + âm thanh.
      await Notifications.setNotificationChannelAsync('med-wellness-v2', {
        name: 'Hỏi thăm sức khỏe',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#12659c',
      });
    }
    await Notifications.setNotificationCategoryAsync(
      WELLNESS_CATEGORY_ID,
      WELLNESS_QUICK_ANSWERS.map((item) => ({
        identifier: item.action,
        buttonTitle: item.title,
        options: { opensAppToForeground: true },
      })),
      { previewPlaceholder: 'Chọn tình trạng sức khỏe' },
    );
  } catch {
    // Thiết bị/phiên bản không hỗ trợ category không được chặn app.
  }
}

async function getPushTokenAsync(): Promise<string | null> {
  // `expo-notifications` không hỗ trợ web; dùng Firebase Web Push thay thế.
  if (Platform.OS === 'web') {
    const result = await registerWebPush({ requestPermission: true });
    return result.token;
  }

  try {
    await configureNotifications();

    // Cho phép bật push trên emulator khi cần test LAN (mặc định tắt).
    const allowEmulatorPush =
      String(Constants?.expoConfig?.extra?.ALLOW_EMULATOR_PUSH ?? "").toLowerCase() === "true";
    if (!Device.isDevice && !allowEmulatorPush) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
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

    // Ưu tiên Expo Push Token: backend gửi qua Expo Push Service, hoạt động cả
    // Expo Go lẫn development build khi project đã liên kết EAS. Native/FCM token
    // chỉ là phương án dự phòng khi Expo Push Service không khả dụng.
    return (await getExpoToken()) ?? (await getNativeToken());
  } catch {
    return null;
  }
}

/**
 * Bật push cho nền tảng hiện tại và đăng ký token với backend.
 * - Native: Expo Push Token (hoặc FCM/APNs token dự phòng).
 * - Web: FCM Web Push token qua service worker + VAPID key.
 */
export async function enablePushNotifications(
  options: WebPushOptions = {},
): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return registerWebPush(options);
  }

  const token = await getPushTokenAsync();
  const platform: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  if (token) {
    await registerDevice({ fcmToken: token, platform });
  }
  return { token, platform };
}

export async function registerDevicePushToken(): Promise<void> {
  try {
    // Không tự bật hộp thoại quyền trên web; chỉ đăng ký nếu người dùng đã cấp quyền.
    await enablePushNotifications({ requestPermission: false });
  } catch {
    // best-effort: do not block app usage
  }
}

/** Tắt token của phiên hiện tại khi đăng xuất (hiện chỉ cần thiết trên web). */
export async function disablePushNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await disableWebPush();
    } catch {
      // best-effort
    }
  }
}

/** Token đang lưu trên thiết bị (hiện chỉ web lưu lại để hiển thị trong Hồ sơ). */
export function getCurrentPushToken(): string | null {
  if (Platform.OS === 'web') return getCurrentWebPushToken();
  return null;
}
