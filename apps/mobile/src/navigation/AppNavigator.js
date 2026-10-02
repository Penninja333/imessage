import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useAppTheme } from '../context/ThemeContext';
import { registerForPushNotificationsAsync, registerDeviceToken } from '../services/notifications';

import AuthScreen from '../screens/AuthScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { colors } = useAppTheme();

  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const connectSocket = useAuthStore((state) => state.connectSocket);
  const disconnectSocket = useAuthStore((state) => state.disconnectSocket);

  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);
  const getUsers = useChatStore((state) => state.getUsers);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      getToken().then((token) => {
        if (token) {
          checkAuth(token).then((user) => {
            if (user) {
              subscribeToMessages();
              getUsers();

              // Register device for push notifications
              registerForPushNotificationsAsync().then((pushToken) => {
                if (pushToken) {
                  registerDeviceToken(pushToken);
                }
              });
            }
          });
        }
      });
    } else {
      unsubscribeFromMessages();
      clearAuth();
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isSignedIn) {
          getToken().then((token) => {
            connectSocket(token);
            subscribeToMessages();
            getUsers();
          });
        }
      } else if (nextAppState.match(/inactive|background/)) {
        disconnectSocket();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn]);

  if (!isLoaded || (isSignedIn && isCheckingAuth)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!isSignedIn ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
