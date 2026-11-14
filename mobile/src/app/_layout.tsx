import { useEffect } from "react";
import { Platform } from "react-native";
import { Slot, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "../store/auth";
import { FontScaleProvider } from "../store/fontScale";
import { configureNotifications } from "../services/notifications";
import { parseWellnessAction } from "../utils/wellness";

const handledResponses = new Set<string>();

function navigateFromNotification(response: Notifications.NotificationResponse) {
  const data = response.notification?.request?.content?.data as Record<string, any> | undefined | null;
  if (!data) return;

  // `getLastNotificationResponseAsync` và listener có thể cùng trả về một response.
  const responseKey = `${response.notification?.request?.identifier ?? ''}:${response.actionIdentifier ?? ''}`;
  if (handledResponses.has(responseKey)) return;
  handledResponses.add(responseKey);
  try {
    Notifications.clearLastNotificationResponse();
  } catch {}

  const kind = data.type || data.kind;
  const wellnessAnswer = parseWellnessAction(response.actionIdentifier);
  if (kind === 'wellness_check' || wellnessAnswer) {
    const healthLogId = data.healthLogId || data.health_log_id;
    const params: string[] = [];
    if (typeof healthLogId === 'string' && healthLogId) {
      params.push(`logId=${encodeURIComponent(healthLogId)}`);
    }
    if (wellnessAnswer) params.push(`answer=${wellnessAnswer}`);
    const path = `/health-journal${params.length > 0 ? `?${params.join('&')}` : ''}`;
    try {
      router.push(path as any);
      return;
    } catch {}
  }

  if (typeof data.url === 'string' && data.url.startsWith('/health-journal')) {
    try {
      router.push(data.url as any);
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
    // Web dùng service worker/FCM riêng, không dùng expo-notifications.
    if (Platform.OS === 'web') return;

    void configureNotifications();

    // Handle tap that launched the app from killed state.
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        if (res) navigateFromNotification(res);
      })
      .catch(() => {});

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      navigateFromNotification(res);
    });
    return () => {
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
