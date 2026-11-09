import { useEffect } from "react";
import { Platform } from "react-native";
import { Slot, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "../store/auth";
import { FontScaleProvider } from "../store/fontScale";

function navigateFromNotification(data: Record<string, any> | undefined | null) {
  if (!data) return;
  const kind = data.type || data.kind;
  if (kind === 'wellness_check') {
    try {
      router.push('/health-journal' as any);
      return;
    } catch {}
  }
  const doseId = data.doseId || data.dose_id || data.id;
  const action = data.action || data.click_action;
  if (typeof doseId === 'string' && doseId) {
    const path = action ? `/dose/${doseId}?action=${encodeURIComponent(String(action))}` : `/dose/${doseId}`;
    try {
      router.push(path as any);
      return;
    } catch {}
  }
  if (typeof data.url === 'string') {
    const m = data.url.match(/\/dose\/([^/?#]+)/);
    if (m?.[1]) {
      try {
        router.push(`/dose/${m[1]}` as any);
        return;
      } catch {}
    }
  }
  try {
    router.push("/(tabs)");
  } catch {}
}

function NotificationListeners() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('default', {
        name: 'Nhắc uống thuốc',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12659c',
        sound: 'default',
        enableVibrate: true,
      }).catch(() => {});
    }
    // Handle tap that launched the app from killed state
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        if (res) navigateFromNotification(res.notification?.request?.content?.data as any);
      })
      .catch(() => {});

    const received = Notifications.addNotificationReceivedListener(() => {
      // Foreground notifications are shown by the handler; screens can refresh via focus/pull-to-refresh.
    });
    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      navigateFromNotification(res.notification?.request?.content?.data as any);
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FontScaleProvider>
        <AuthProvider>
          <NotificationListeners />
          <Slot />
        </AuthProvider>
      </FontScaleProvider>
    </SafeAreaProvider>
  );
}
