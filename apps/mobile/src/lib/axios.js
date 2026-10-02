import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://imessage-fwxv.onrender.com/api";

export const axiosInstance = axios.create({
  baseURL: API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().sessionToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
