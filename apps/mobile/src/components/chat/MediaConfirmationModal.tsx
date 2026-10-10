import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";

interface Props {
  visible: boolean;
  mediaUri: string | null;
  isVideo?: boolean;
  onSend: (data: { caption?: string; viewOnce?: boolean }) => void;
  onCancel: () => void;
}

const { width, height } = Dimensions.get("window");

export const MediaConfirmationModal: React.FC<Props> = ({
  visible,
  mediaUri,
  isVideo = false,
  onSend,
  onCancel,
}) => {
  const [caption, setCaption] = useState("");
  const [isViewOnce, setIsViewOnce] = useState(false);

  if (!visible || !mediaUri) return null;

  const handleSend = () => {
    onSend({ caption: caption.trim() || undefined, viewOnce: isViewOnce });
    setCaption("");
    setIsViewOnce(false);
  };

  const handleCancel = () => {
    setCaption("");
    setIsViewOnce(false);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>

            {!isVideo ? (
              <TouchableOpacity
                style={[styles.viewOnceToggle, isViewOnce && styles.viewOnceToggleActive]}
                onPress={() => setIsViewOnce(!isViewOnce)}
                activeOpacity={0.7}
              >
                <View style={[styles.circleBadge, isViewOnce && styles.circleBadgeActive]}>
                  <Text style={[styles.circleNumber, isViewOnce && styles.circleNumberActive]}>
                    1
                  </Text>
                </View>
                <Text style={[styles.viewOnceLabel, isViewOnce && styles.viewOnceLabelActive]}>
                  {isViewOnce ? "View once on" : "View once"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.previewContainer}>
            <Image source={{ uri: mediaUri }} style={styles.image} contentFit="contain" />
          </View>

          <View style={styles.bottomBar}>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  viewOnceToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  viewOnceToggleActive: {
    backgroundColor: "#007AFF",
  },
  circleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  circleBadgeActive: {
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
  },
  circleNumber: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  circleNumberActive: {
    color: "#007AFF",
  },
  viewOnceLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  viewOnceLabelActive: {
    color: "#FFFFFF",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height * 0.65,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  captionInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
