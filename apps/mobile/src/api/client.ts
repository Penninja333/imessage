import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Default production backend on Render
const defaultHost = "https://imessage-fwxv.onrender.com";
const rawBaseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  defaultHost;
const baseURL = rawBaseURL.endsWith("/api") ? rawBaseURL : `${rawBaseURL}/api`;

export const apiClient = axios.create({
  baseURL,
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
