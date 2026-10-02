import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, AppState, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { axiosInstance } from '../lib/axios';
import AuthScreen from '../screens/AuthScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Project ID usually fetched from app.config.js/app.json if using EAS
    // For local dev, this might log a warning but often works or needs projectId explicitly
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (e) {
      console.warn("Failed getting Expo push token (ensure projectId is in app.json if using EAS)", e.message);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default function AppNavigator() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const connectSocket = useAuthStore((state) => state.connectSocket);
  const disconnectSocket = useAuthStore((state) => state.disconnectSocket);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  
  const getConversations = useChatStore((state) => state.getConversations);
  const getMessages = useChatStore((state) => state.getMessages);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      getToken().then((token) => {
        checkAuth(token).then(() => {
          // After auth, register push
          registerForPushNotificationsAsync().then((pushToken) => {
             if (pushToken) {
               axiosInstance.post('/devices/register', {
                 token: pushToken,
                 platform: Platform.OS,
                 appVersion: '1.0.0'
               }).catch(e => console.error("Failed to register device token", e));
             }
          });
        });
      });
    } else {
      clearAuth();
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground!
        if (isSignedIn) {
           connectSocket();
           getConversations();
           if (activeConversationId) {
             getMessages(activeConversationId); // Refetch messages to get missed ones
           }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to background
        disconnectSocket();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isSignedIn, activeConversationId]);

  if (!isLoaded || (isSignedIn && isCheckingAuth)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
