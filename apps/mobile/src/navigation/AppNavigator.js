import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/expo';
import { useAuthStore } from '../store/useAuthStore';
import AuthScreen from '../screens/AuthScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      getToken().then((token) => {
        checkAuth(token);
      });
    } else {
      clearAuth();
    }
  }, [isLoaded, isSignedIn, getToken]);

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
