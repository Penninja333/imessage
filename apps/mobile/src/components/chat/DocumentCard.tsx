import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../../theme/ThemeContext";

interface Props {
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  isOwn: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export const DocumentCard: React.FC<Props> = ({ fileUrl, fileName, fileSize, isOwn }) => {
  const { colors, isDark } = useAppTheme();
  const [isDownloading, setIsDownloading] = useState(false);

  const cleanName = fileName || "Document";
  const sizeText = formatBytes(fileSize);

  const handleDownload = async () => {
    if (!fileUrl) return;
    setIsDownloading(true);
    try {
      const localUri = `${FileSystem.documentDirectory}${cleanName}`;
      const result = await FileSystem.downloadAsync(fileUrl, localUri);
      setIsDownloading(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert("File Downloaded", `Saved to ${result.uri}`);
      }
    } catch (err: any) {
      console.warn("Download document error:", err.message);
      setIsDownloading(false);
      Alert.alert("Error", "Could not download document");
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isOwn ? "rgba(255,255,255,0.18)" : isDark ? "#2C2C2E" : "#E5E5EA",
        },
      ]}
      onPress={handleDownload}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isOwn ? "rgba(255,255,255,0.25)" : colors.accent + "20" },
        ]}
      >
        <Text style={styles.docIcon}>📄</Text>
      </View>

      <View style={styles.textGroup}>
        <Text
          style={[styles.fileName, { color: isOwn ? "#FFFFFF" : colors.text }]}
          numberOfLines={1}
        >
          {cleanName}
        </Text>
        {sizeText ? (
          <Text
            style={[styles.fileSize, { color: isOwn ? "rgba(255,255,255,0.7)" : colors.textMuted }]}
          >
            {sizeText}
          </Text>
        ) : null}
      </View>

      {isDownloading ? (
        <ActivityIndicator size="small" color={isOwn ? "#FFFFFF" : colors.accent} />
      ) : (
        <Text style={[styles.downloadArrow, { color: isOwn ? "#FFFFFF" : colors.accent }]}>
          ↓
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 200,
    maxWidth: 260,
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  docIcon: {
    fontSize: 18,
  },
  textGroup: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
  },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  downloadArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
});
