import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useAppTheme } from "../../theme/ThemeContext";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { MediaConfirmationModal } from "./MediaConfirmationModal";

interface Props {
  receiverId: string;
}

export const ChatComposer: React.FC<Props> = ({ receiverId }) => {
  const { colors, isDark } = useAppTheme();
  const socket = useAuthStore((s) => s.socket);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendMedia = useChatStore((s) => s.sendMedia);
  const editMessage = useChatStore((s) => s.editMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const sendStopTyping = useChatStore((s) => s.sendStopTyping);

  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<any>(null);

  // Attachment picker menu modal state
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Selected media pending confirmation
  const [pendingMedia, setPendingMedia] = useState<{
    uri: string;
    type: "image" | "video";
    fileName?: string;
  } | null>(null);

  // Audio recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const recordIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
    }
  }, [editingMessage]);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, [recording]);

  const handleTextChange = (val: string) => {
    setText(val);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (val.trim()) {
      sendTyping(receiverId, socket);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(receiverId, socket);
      }, 2500);
    } else {
      sendStopTyping(receiverId, socket);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendStopTyping(receiverId, socket);

    if (editingMessage) {
      const ok = await editMessage(editingMessage._id, trimmed);
      if (ok) {
        setText("");
        setEditingMessage(null);
      }
      return;
    }

    setText("");
    await sendMessage(receiverId, trimmed);
  };

  // Image & Camera Pickers
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPendingMedia({
          uri: asset.uri,
          type: "image",
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        });
      }
    } catch (e: any) {
      console.warn("[ChatComposer] Image pick error:", e.message);
    }
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPendingMedia({
          uri: asset.uri,
          type: "image",
          fileName: `camera_${Date.now()}.jpg`,
        });
      }
    } catch (e: any) {
      console.warn("[ChatComposer] Camera error:", e.message);
    }
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsSendingMedia(true);
        try {
          await sendMedia(receiverId, {
            fileUri: asset.uri,
            fileName: asset.name || "document",
            fileType: asset.mimeType || "application/octet-stream",
          });
        } finally {
          setIsSendingMedia(false);
        }
      }
    } catch (e: any) {
      console.warn("[ChatComposer] Document pick error:", e.message);
    }
  };

  // Confirm sending media from modal (with optional View Once)
  const handleConfirmMedia = async (data: { caption?: string; viewOnce?: boolean }) => {
    if (!pendingMedia) return;
    const mediaToUpload = pendingMedia;
    setPendingMedia(null);
    setIsSendingMedia(true);

    try {
      await sendMedia(receiverId, {
        fileUri: mediaToUpload.uri,
        fileName: mediaToUpload.fileName,
        fileType: "image/jpeg",
        text: data.caption,
        viewOnce: data.viewOnce,
      });
    } finally {
      setIsSendingMedia(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("[ChatComposer] startRecording error:", err.message);
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording) return;

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        setIsSendingMedia(true);
        try {
          await sendMedia(receiverId, {
            fileUri: uri,
            fileName: `voice_${Date.now()}.m4a`,
            fileType: "audio/m4a",
          });
        } finally {
          setIsSendingMedia(false);
        }
      }
    } catch (err: any) {
      console.warn("[ChatComposer] stopAndSendRecording error:", err.message);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recording.stopAndUnloadAsync();
    } catch {}

    setIsRecording(false);
    setRecording(null);
    setRecordingDuration(0);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const canSend = text.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: isDark ? "#2C2C2E" : "#E5E5EA",
        },
      ]}
    >
      {/* Banner for Replying Mode */}
      {replyingTo ? (
        <View style={[styles.modeBanner, { backgroundColor: colors.surface }]}>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeTitle, { color: colors.accent }]}>Replying to message</Text>
            <Text style={[styles.modeSnippet, { color: colors.textMuted }]} numberOfLines={1}>
              {replyingTo.text || "Media"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeModeButton}>
            <Text style={[styles.closeModeText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Banner for Editing Mode */}
      {editingMessage ? (
        <View style={[styles.modeBanner, { backgroundColor: colors.surface }]}>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeTitle, { color: colors.accent }]}>Editing message</Text>
            <Text style={[styles.modeSnippet, { color: colors.textMuted }]} numberOfLines={1}>
              {editingMessage.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setText("");
            }}
            style={styles.closeModeButton}
          >
            <Text style={[styles.closeModeText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Audio Recording Active View */}
      {isRecording ? (
        <View style={styles.recordingRow}>
          <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
            <Text style={styles.cancelRecText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.recordingIndicator}>
            <View style={styles.pulseDot} />
            <Text style={[styles.recordTimeText, { color: colors.text }]}>
              {formatSeconds(recordingDuration)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={stopAndSendRecording}
            style={[styles.sendButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          {/* Plus / Attach Button */}
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
            onPress={() => setShowAttachMenu(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.attachPlus, { color: colors.text }]}>+</Text>
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
                color: colors.text,
                borderColor: isDark ? "#2C2C2E" : "#E5E5EA",
              },
            ]}
            placeholder={editingMessage ? "Edit message..." : "iMessage"}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            value={text}
            onChangeText={handleTextChange}
            enablesReturnKeyAutomatically
          />

          {isSendingMedia ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginHorizontal: 6 }} />
          ) : canSend ? (
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.accent }]}
              onPress={handleSend}
              activeOpacity={0.8}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.micButton, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
              onPress={startRecording}
              activeOpacity={0.7}
            >
              <Text style={styles.micEmoji}>🎙️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Attach Sheet Modal */}
      <Modal visible={showAttachMenu} transparent animationType="fade">
        <Pressable style={styles.attachOverlay} onPress={() => setShowAttachMenu(false)}>
          <View style={[styles.attachMenuCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickImage}>
              <Text style={styles.attachMenuIcon}>🖼️</Text>
              <Text style={[styles.attachMenuLabel, { color: colors.text }]}>Photo & Video Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handleTakePhoto}>
              <Text style={styles.attachMenuIcon}>📷</Text>
              <Text style={[styles.attachMenuLabel, { color: colors.text }]}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickDocument}>
              <Text style={styles.attachMenuIcon}>📄</Text>
              <Text style={[styles.attachMenuLabel, { color: colors.text }]}>Document / File</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Confirmation Modal for picked media (View Once toggle ①) */}
      {pendingMedia ? (
        <MediaConfirmationModal
          visible={Boolean(pendingMedia)}
          mediaUri={pendingMedia.uri}
          isVideo={pendingMedia.type === "video"}
          onCancel={() => setPendingMedia(null)}
          onSend={handleConfirmMedia}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  modeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  modeTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  modeSnippet: {
    fontSize: 12,
  },
  closeModeButton: {
    padding: 4,
  },
  closeModeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  attachPlus: {
    fontSize: 22,
    fontWeight: "500",
    marginTop: -2,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendArrow: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: -2,
    color: "#FFFFFF",
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  micEmoji: {
    fontSize: 18,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelRecBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelRecText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF3B30",
  },
  recordTimeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  attachOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    paddingBottom: 90,
    paddingHorizontal: 16,
  },
  attachMenuCard: {
    borderRadius: 18,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  attachMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  attachMenuIcon: {
    fontSize: 22,
  },
  attachMenuLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});
