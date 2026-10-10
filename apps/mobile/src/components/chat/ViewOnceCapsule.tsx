import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";
import { ViewOnceModal } from "./ViewOnceModal";
import { apiClient } from "../../api/client";

interface Props {
  messageId: string;
  viewedOnce: boolean;
  isOwn: boolean;
  initialImageUrl?: string | null;
  onOpened?: () => void;
}

export const ViewOnceCapsule: React.FC<Props> = ({
  messageId,
  viewedOnce,
  isOwn,
  initialImageUrl,
  onOpened,
}) => {
  const { colors, isDark } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isOpening, setIsOpening] = useState(false);
  const [hasViewedLocal, setHasViewedLocal] = useState(viewedOnce);

  const isConsumed = viewedOnce || hasViewedLocal;

  const handleOpen = async () => {
    if (isConsumed) {
      Alert.alert("Photo Expired", "This view-once photo has already been opened.");
      return;
    }

    if (isOwn) {
      Alert.alert("View Once Photo", "You sent a view once photo.");
      return;
    }

    setIsOpening(true);
    try {
      const res = await apiClient.post(`/messages/${messageId}/view-once`);
      setActiveImageUrl(res.data.imageUrl);
      setIsOpening(false);
      setModalVisible(true);
      setHasViewedLocal(true);
      if (onOpened) onOpened();
    } catch (err: any) {
      setIsOpening(false);
      if (err.response?.status === 410) {
        setHasViewedLocal(true);
        Alert.alert("Expired", "This view-once photo has already been opened.");
      } else {
        Alert.alert("Error", "Could not open photo");
      }
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setActiveImageUrl(null); // permanently burn the image from memory
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.capsule,
          isConsumed
            ? [
                styles.capsuleExpired,
                {
                  backgroundColor: isOwn
                    ? "rgba(255,255,255,0.15)"
                    : isDark
                    ? "#2C2C2E"
                    : "#E5E5EA",
                },
              ]
            : [
                styles.capsuleActive,
                {
                  backgroundColor: isOwn
                    ? "rgba(255,255,255,0.22)"
                    : colors.accent + "18",
                  borderColor: isOwn ? "rgba(255,255,255,0.3)" : colors.accent + "40",
                },
              ],
        ]}
        onPress={handleOpen}
        activeOpacity={isConsumed ? 0.9 : 0.7}
      >
        <View
          style={[
            styles.circleIcon,
            {
              borderColor: isConsumed
                ? isOwn
                  ? "rgba(255,255,255,0.5)"
                  : colors.textMuted
                : isOwn
                ? "#FFFFFF"
                : colors.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.circleNumber,
              {
                color: isConsumed
                  ? isOwn
                    ? "rgba(255,255,255,0.5)"
                    : colors.textMuted
                  : isOwn
                  ? "#FFFFFF"
                  : colors.accent,
              },
            ]}
          >
            1
          </Text>
        </View>

        <Text
          style={[
            styles.capsuleText,
            {
              color: isConsumed
                ? isOwn
                  ? "rgba(255,255,255,0.6)"
                  : colors.textMuted
                : isOwn
                ? "#FFFFFF"
                : colors.accent,
              fontStyle: isConsumed ? "italic" : "normal",
            },
          ]}
        >
          {isOpening
            ? "Opening..."
            : isConsumed
            ? "Opened"
            : isOwn
            ? "Photo · View once"
            : "Photo · Tap to view"}
        </Text>

        {isOpening ? (
          <ActivityIndicator
            size="small"
            color={isOwn ? "#FFFFFF" : colors.accent}
            style={styles.spinner}
          />
        ) : null}
      </TouchableOpacity>

      <ViewOnceModal
        visible={modalVisible}
        imageUrl={activeImageUrl}
        onClose={handleCloseModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    alignSelf: "flex-start",
  },
  capsuleActive: {
    borderWidth: 1,
  },
  capsuleExpired: {
    opacity: 0.85,
  },
  circleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    justifyContent: "center",
    alignItems: "center",
  },
  circleNumber: {
    fontSize: 10,
    fontWeight: "900",
  },
  capsuleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  spinner: {
    marginLeft: 4,
  },
});
