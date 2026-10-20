/// <reference types="vite/client" />

const env = import.meta.env;

/** Base URL API — mặc định dùng proxy Vite (/api/v1 → localhost:3000) */
export const API_BASE: string = (env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

/** Origin backend (bỏ hậu tố /api/v1) — dùng cho GET /health */
export const SERVER_ORIGIN: string = API_BASE.replace(/\/api\/v1\/?$/, '');

/** Cấu hình Firebase Web app (Firebase Console → Your apps → Web app) */
export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) ?? '',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? '',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? '',
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? '',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? '',
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) ?? '',
};

/** Chưa điền config → app chạy được nhưng chưa đăng nhập thật */
export const isFirebaseConfigured: boolean = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** VAPID key cho Web Push — Giai đoạn 5 */
export const vapidKey: string = (env.VITE_FIREBASE_VAPID_KEY as string | undefined) ?? '';
