import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { API_BASE } from "../config";
import { getIdToken } from "./firebase";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE,
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });

    this.instance.interceptors.request.use(async (config) => {
      try {
        const token = await getIdToken();
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as any).Authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore
      }
      return config;
    });
  }

  async fetch<T>(path: string, options: AxiosRequestConfig = {}): Promise<T> {
    try {
      const res = await this.instance.request({
        url: path,
        ...options,
      });
      const json = res.data as any;
      if (json && typeof json === "object" && "success" in json) {
        if (json.success === false) {
          const code = json.error?.code ?? `HTTP_${res.status}`;
          const message = json.error?.message ?? "Lỗi máy chủ";
          throw new ApiError(res.status, code, message);
        }
        return (json.data !== undefined ? json.data : json) as T;
      }
      return json as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      const err = e as AxiosError<any>;
      if (!err.response) {
        throw new ApiError(0, "NETWORK_ERROR", "Không kết nối được máy chủ");
      }
      const json = err.response.data;
      const code = json?.error?.code ?? `HTTP_${err.response.status}`;
      const message = json?.error?.message ?? "Lỗi máy chủ";
      throw new ApiError(err.response.status, code, message);
    }
  }
}

export const apiClient = new ApiClient();
export async function apiFetch<T>(path: string, options: { method?: AxiosRequestConfig["method"]; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = "GET", body } = options;
  return apiClient.fetch<T>(path, { method, data: body });
}
