import Constants from "expo-constants";

const env = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const API_BASE: string = env.API_BASE_URL ?? "http://10.0.2.2:3000/api/v1";
export const SERVER_ORIGIN: string = API_BASE.replace(/\/api\/v1\/?$/, "");

export const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY ?? "",
  authDomain: env.FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured: boolean = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export const vapidKey: string = env.FIREBASE_VAPID_KEY ?? "";
