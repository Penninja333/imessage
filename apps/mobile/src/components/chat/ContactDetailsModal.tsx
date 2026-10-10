import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useAppTheme } from "../../theme/ThemeContext";
import { Avatar } from "../common/Avatar";
import { ApiMessage, fetchStarredMessages, muteConversation, unmuteConversation, setNickname } from "../../api/messages";
import { PeerProfile } from "../../utils/normalize";

interface Props {
  visible: boolean;
  peer: PeerProfile;
  messages: ApiMessage[];
  currentTheme: string;
  isMuted?: boolean;
  onClose: () => void;
  onOpenThemePicker: () => void;
  onOpenSearch: () => void;
  onNicknameUpdated?: (newNickname: string) => void;
}

type TabType = "media" | "audio" | "files" | "starred";

export const ContactDetailsModal: React.FC<Props> = ({
  visible,
  peer,
  messages,
  currentTheme,
  isMuted = false,
  onClose,
  onOpenThemePicker,
  onOpenSearch,
  onNicknameUpdated,
}) => {
  const { colors, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState<TabType>("media");

  // Nickname editing
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(peer.nickname || "");

  // Mute state
  const [muted, setMuted] = useState(isMuted);
  const [showMuteSheet, setShowMuteSheet] = useState(false);

  // Starred messages
  const [starredMessages, setStarredMessages] = useState<ApiMessage[]>([]);
  const [isLoadingStarred, setIsLoadingStarred] = useState(false);

  useEffect(() => {
    setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (visible && activeTab === "starred") {
      loadStarred();
    }
  }, [visible, activeTab, peer.id]);

  const loadStarred = async () => {
    setIsLoadingStarred(true);
    try {
      const res = await fetchStarredMessages(peer.id);
      setStarredMessages(res || []);
    } catch (err: any) {
      console.warn("[ContactDetails] loadStarred error:", err.message);
    } finally {
      setIsLoadingStarred(false);
    }
  };

  const handleSaveNickname = async () => {
    try {
      await setNickname(peer.id, nicknameInput.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingNickname(false);
      if (onNicknameUpdated) {
        onNicknameUpdated(nicknameInput.trim());
      }
    } catch (err: any) {
      Alert.alert("Error", "Could not update nickname");
    }
  };

  const handleMute = async (duration: string) => {
    setShowMuteSheet(false);
    try {
      await muteConversation(peer.id, duration);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMuted(true);
    } catch {
      Alert.alert("Error", "Could not mute conversation");
    }
  };

  const handleUnmute = async () => {
    try {
      await unmuteConversation(peer.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMuted(false);
    } catch {
      Alert.alert("Error", "Could not unmute conversation");
    }
  };

  // Filter messages for tabs
  const mediaList = messages.filter((m) => (m.image || m.video) && !m.deleted && !m.viewOnce);
  const audioList = messages.filter((m) => m.audio && !m.deleted);
  const filesList = messages.filter((m) => m.fileUrl && !m.deleted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.accent }]}>Done</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Info</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <Avatar
              uri={peer.avatarUrl}
              initials={peer.initials}
              size={80}
              isOnline={peer.isOnline}
            />
            <Text style={[styles.fullName, { color: colors.text }]}>
              {peer.nickname ? `${peer.nickname} (${peer.fullName})` : peer.fullName}
            </Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>{peer.subtitle}</Text>

            {/* Nickname Editor */}
            {editingNickname ? (
              <View style={styles.nicknameEditRow}>
                <TextInput
                  style={[
                    styles.nicknameInput,
                    {
                      color: colors.text,
                      backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                      borderColor: colors.accent,
                    },
                  ]}
                  placeholder="Add custom nickname"
                  placeholderTextColor={colors.textMuted}
                  value={nicknameInput}
                  onChangeText={setNicknameInput}
                  autoFocus
                />
                <TouchableOpacity style={styles.saveNickBtn} onPress={handleSaveNickname}>
                  <Text style={[styles.saveNickText, { color: colors.accent }]}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEditingNickname(true)}
                style={styles.editNickBtn}
              >
                <Text style={[styles.editNickText, { color: colors.accent }]}>
                  {peer.nickname ? "Edit Nickname" : "Add Nickname"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
              onPress={() => {
                onClose();
                onOpenSearch();
              }}
            >
              <Text style={styles.actionIcon}>🔍</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
              onPress={() => {
                onClose();
                onOpenThemePicker();
              }}
            >
              <Text style={styles.actionIcon}>🎨</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Theme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
              onPress={() => {
                if (muted) {
                  handleUnmute();
                } else {
                  setShowMuteSheet(true);
                }
              }}
            >
              <Text style={styles.actionIcon}>{muted ? "🔔" : "🔕"}</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {muted ? "Unmute" : "Mute"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: isDark ? "#1C1C1E" : "#E5E5EA",
              },
            ]}
          >
            {(["media", "audio", "files", "starred"] as TabType[]).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    isSelected && {
                      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
                      shadowColor: "#000",
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isSelected ? colors.text : colors.textMuted,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === "media" && (
            <View style={styles.mediaGrid}>
              {mediaList.length === 0 ? (
                <Text style={[styles.emptyTab, { color: colors.textMuted }]}>No photos or videos</Text>
              ) : (
                mediaList.map((m) => (
                  <Image
                    key={m._id}
                    source={{ uri: m.image || m.video }}
                    style={styles.mediaThumb}
                    contentFit="cover"
                  />
                ))
              )}
            </View>
          )}

          {activeTab === "audio" && (
            <View style={styles.listContainer}>
              {audioList.length === 0 ? (
                <Text style={[styles.emptyTab, { color: colors.textMuted }]}>No voice messages</Text>
              ) : (
                audioList.map((m) => (
                  <View
                    key={m._id}
                    style={[styles.listItem, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
                  >
                    <Text style={styles.listIcon}>🎤</Text>
                    <View style={styles.listMeta}>
                      <Text style={[styles.listTitle, { color: colors.text }]}>Voice message</Text>
                      <Text style={[styles.listSub, { color: colors.textMuted }]}>
                        {new Date(m.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "files" && (
            <View style={styles.listContainer}>
              {filesList.length === 0 ? (
                <Text style={[styles.emptyTab, { color: colors.textMuted }]}>No shared documents</Text>
              ) : (
                filesList.map((m) => (
                  <View
                    key={m._id}
                    style={[styles.listItem, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
                  >
                    <Text style={styles.listIcon}>📄</Text>
                    <View style={styles.listMeta}>
                      <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>
                        {m.fileName || "Document"}
                      </Text>
                      <Text style={[styles.listSub, { color: colors.textMuted }]}>
                        {new Date(m.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "starred" && (
            <View style={styles.listContainer}>
              {isLoadingStarred ? (
                <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
              ) : starredMessages.length === 0 ? (
                <Text style={[styles.emptyTab, { color: colors.textMuted }]}>No starred messages</Text>
              ) : (
                starredMessages.map((m) => (
                  <View
                    key={m._id}
                    style={[styles.listItem, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
                  >
                    <Text style={styles.listIcon}>⭐</Text>
                    <View style={styles.listMeta}>
                      <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={2}>
                        {m.text || "Media message"}
                      </Text>
                      <Text style={[styles.listSub, { color: colors.textMuted }]}>
                        {new Date(m.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* Mute Duration Sheet */}
        <Modal visible={showMuteSheet} transparent animationType="fade">
          <Pressable style={styles.muteOverlay} onPress={() => setShowMuteSheet(false)}>
            <View style={[styles.muteCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
              <Text style={[styles.muteTitle, { color: colors.text }]}>Mute Notifications</Text>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute("1h")}>
                <Text style={[styles.muteOptText, { color: colors.text }]}>For 1 hour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute("8h")}>
                <Text style={[styles.muteOptText, { color: colors.text }]}>For 8 hours</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute("1w")}>
                <Text style={[styles.muteOptText, { color: colors.text }]}>For 1 week</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.muteOption} onPress={() => handleMute("always")}>
                <Text style={[styles.muteOptText, { color: colors.text }]}>Always</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  fullName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  nicknameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  nicknameInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    minWidth: 160,
  },
  saveNickBtn: {
    padding: 6,
  },
  saveNickText: {
    fontSize: 15,
    fontWeight: "600",
  },
  editNickBtn: {
    marginTop: 8,
    padding: 6,
  },
  editNickText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionCard: {
    width: 80,
    height: 70,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 13,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  mediaThumb: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 10,
  },
  emptyTab: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 14,
    width: "100%",
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  listIcon: {
    fontSize: 22,
  },
  listMeta: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  listSub: {
    fontSize: 12,
    marginTop: 2,
  },
  muteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  muteCard: {
    borderRadius: 16,
    paddingVertical: 12,
  },
  muteTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  muteOption: {
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  muteOptText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
