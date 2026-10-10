import React, { useEffect } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";
import { RootStackParamList } from "./types";
import { AuthScreen } from "../screens/AuthScreen";
import { ConversationsScreen } from "../screens/ConversationsScreen";
import { ChatRoomScreen } from "../screens/ChatRoomScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { useAppTheme } from "../theme/ThemeContext";
import { setAuthTokenProvider } from "../api/client";
import { registerForPushNotifications, setupNotificationListeners } from "../utils/notifications";

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    if (getToken) {
      setAuthTokenProvider(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) {
      // Register device for push notifications
      registerForPushNotifications();

      // Setup response tap listener
      const unsubscribe = setupNotificationListeners((senderId, senderName) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate("ChatRoom", {
            conversationId: senderId,
            peerName: senderName || "Friend",
          });
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: isDark,
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "900" },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {!isSignedIn ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Conversations" component={ConversationsScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen
              name="Contacts"
              component={ContactsScreen}
              options={{ presentation: "modal" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
