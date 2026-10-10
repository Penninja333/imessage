import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider } from "@clerk/clerk-expo";
import Constants from "expo-constants";
import { View, Text, TouchableOpacity } from "react-native";
import { tokenCache } from "./src/utils/tokenCache";
import { ThemeProvider, useAppTheme } from "./src/theme/ThemeContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.clerkPublishableKey ||
  "pk_test_bXVzaWNhbC1kb3J5LTI2MDQuY2xlcmsuYWNjb3VudHMuZGV2JA";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[RootErrorBoundary caught error]", error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#000000", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 12 }}>iMessage</Text>
          <Text style={{ color: "#A0A0A0", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
            An unexpected error occurred while launching.
            {this.state.error?.message ? `\n\n(${this.state.error.message})` : ""}
          </Text>
          <TouchableOpacity
            onPress={this.handleRestart}
            activeOpacity={0.8}
            style={{ backgroundColor: "#007AFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}>Reload</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { isDark } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <SafeAreaProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </SafeAreaProvider>
        </ClerkProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
