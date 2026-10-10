import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Resolve default API host: Android emulator uses 10.0.2.2, iOS simulator uses localhost
const defaultHost = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  `${defaultHost}/api`;

export const apiClient = axios.create({
  baseURL: baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Failed to retrieve Clerk JWT for API request:", err);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("API 401 Unauthorized:", error.config?.url);
    }
    return Promise.reject(error);
  }
);
