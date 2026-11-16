import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const envConfig: Record<string, string | undefined> = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  FIREBASE_VAPID_KEY: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
};

function readConfig(key: string): string {
  // Env thắng extra để build web/APK có thể trỏ tới backend public mà không
  // phải sửa app.json. Nếu không có env thì mới dùng giá trị trong app.json.
  const fromEnv = envConfig[key];
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  const fromExtra = extra[key];
  return typeof fromExtra === "string" ? fromExtra.trim() : "";
}

/**
 * Khi chạy Expo web ở máy dev, backend thường nằm cùng host ở cổng 3000.
 * Không dùng fallback này cho bản deploy: bản production phải có
 * EXPO_PUBLIC_API_BASE_URL trỏ tới backend HTTPS public.
 */
function webDevApiBase(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof window === "undefined" || !window.location) return null;
  if (window.location.protocol === "https:") return null;
  const host = window.location.hostname;
  if (!host || host === "0.0.0.0") return null;
  return `http://${host}:3000/api/v1`;
}

function devLanApiBase(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  try {
    // Expo Go / dev server may expose host like "192.168.1.5:8081" or "exp://192.168.1.5:8081"
    const candidates = [
      (Constants.expoConfig as any)?.hostUri,
      (Constants.expoConfig as any)?.extra?.expoGo?.debuggerHost,
      (Constants.expoConfig as any)?.extra?.expoClient?.hostUri,
      (Constants as any)?.expoGoConfig?.debuggerHost,
      (Constants as any)?.expoGoConfig?.hostUri,
      (Constants as any)?.manifest?.debuggerHost,
      (Constants as any)?.manifest?.hostUri,
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
      (Constants as any)?.linkingUri,
      (Constants as any)?.experienceUrl,
    ];
    for (const raw of candidates) {
      if (typeof raw !== "string" || !raw) continue;
      const m = raw.match(/(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?/);
      if (m?.[1] && m[1] !== "127.0.0.1" && m[1] !== "0.0.0.0") {
        return `http://${m[1]}:3000/api/v1`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

const configuredApiBase = readConfig("API_BASE_URL");
const PLACEHOLDER_IP = "192.168.1.100";
const isUsable = (v: string | null | undefined): v is string =>
  !!v && !v.includes(PLACEHOLDER_IP) && /^https?:\/\//.test(v);

export const API_BASE: string =
  (isUsable(configuredApiBase) ? configuredApiBase : null) ||
  webDevApiBase() ||
  devLanApiBase() ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000/api/v1" : "http://localhost:3000/api/v1");

export const firebaseConfig = {
  apiKey: readConfig("FIREBASE_API_KEY"),
  authDomain: readConfig("FIREBASE_AUTH_DOMAIN"),
  projectId: readConfig("FIREBASE_PROJECT_ID"),
  storageBucket: readConfig("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readConfig("FIREBASE_MESSAGING_SENDER_ID"),
  appId: readConfig("FIREBASE_APP_ID"),
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);
export const vapidKey: string = readConfig("FIREBASE_VAPID_KEY");
