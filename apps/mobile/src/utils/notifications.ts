import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerDeviceToken } from "../api/messages";

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure Android notification channels and request push notification permissions.
 * Registers token with backend /api/device/register.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Android Notification Channel Setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("messages", {
        name: "Direct Messages",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#007AFF",
        sound: "default",
        enableLights: true,
        enableVibrate: true,
      });
    }

    if (!Device.isDevice) {
      console.log("[Push] Running in simulator/emulator — push notifications skipped");
      return null;
    }

    // Permissions check & prompt
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Notification permissions not granted");
      return null;
    }

    let token = "";
    try {
      // Primary: Native device push token (FCM on Android / APNs on iOS)
      const deviceTokenObj = await Notifications.getDevicePushTokenAsync();
      token = typeof deviceTokenObj.data === "string" ? deviceTokenObj.data : JSON.stringify(deviceTokenObj.data);
    } catch {
      // Fallback: Expo Push Token
      const expoTokenObj = await Notifications.getExpoPushTokenAsync();
      token = expoTokenObj.data;
    }

    if (token) {
      const platform = Platform.OS === "ios" ? "ios" : "android";
      await registerDeviceToken(token, platform, "1.0.0");
      console.log(`[Push] Device registered successfully (${platform})`);
      return token;
    }

    return null;
  } catch (err: any) {
    console.warn("[Push] registerForPushNotifications error:", err.message);
    return null;
  }
}

/**
 * Hook listeners for incoming notifications and user taps on notifications
 */
export function setupNotificationListeners(
  onOpenChat: (senderId: string, senderName?: string) => void
) {
  // Listener for user tapping on notification banner
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      try {
        const data = response.notification.request.content.data as any;
        if (data && data.senderId) {
          onOpenChat(String(data.senderId), data.senderName);
        }
      } catch (err: any) {
        console.warn("[Push] response listener error:", err.message);
      }
    }
  );

  return () => {
    responseSubscription.remove();
  };
}
