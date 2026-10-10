import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";

interface Props {
  uri?: string | null;
  initials?: string;
  size?: number;
  isOnline?: boolean;
}

export const Avatar: React.FC<Props> = ({ uri, initials = "??", size = 48, isOnline = false }) => {
  const [hasError, setHasError] = useState(false);
  const { colors, isDark } = useAppTheme();

  const fontSize = Math.max(12, Math.round(size * 0.4));
  const indicatorSize = Math.max(10, Math.round(size * 0.28));
  const borderSize = Math.max(2, Math.round(size * 0.05));

  const showImage = uri && !hasError;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setHasError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA",
            },
          ]}
        >
          <Text style={[styles.initialsText, { fontSize, color: colors.text }]}>
            {initials}
          </Text>
        </View>
      )}

      {isOnline ? (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              borderWidth: borderSize,
              borderColor: colors.background,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    resizeMode: "cover",
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#34C759", // Apple iOS online green
  },
});
