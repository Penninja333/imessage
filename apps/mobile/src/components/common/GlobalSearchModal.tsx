import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";
import { Avatar } from "./Avatar";
import { globalSearchMessages } from "../../api/messages";
import { PeerProfile } from "../../utils/normalize";

interface Props {
  visible: boolean;
  contacts: PeerProfile[];
  onSelectUser: (user: PeerProfile) => void;
  onSelectMessage?: (msg: any) => void;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({
  visible,
  contacts,
  onSelectUser,
  onClose,
}) => {
  const { colors, isDark } = useAppTheme();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [messageResults, setMessageResults] = useState<any[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setMessageResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearchMessages(trimmed);
        setMessageResults(res || []);
      } catch (err: any) {
        console.warn("[GlobalSearch] error:", err.message);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const filteredContacts = contacts.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return false;
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q)) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Search contacts and messages..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                <Text style={[styles.clearText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {isSearching && (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        )}

        <FlatList
          data={[
            ...filteredContacts.map((c) => ({ type: "contact" as const, data: c })),
            ...messageResults.map((m) => ({ type: "message" as const, data: m })),
          ]}
          keyExtractor={(item, index) => `${item.type}-${item.data._id || item.data.id || index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.type === "contact") {
              const contact = item.data as PeerProfile;
              return (
                <TouchableOpacity
                  style={[styles.resultRow, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
                  onPress={() => {
                    onClose();
                    onSelectUser(contact);
                  }}
                >
                  <Avatar uri={contact.avatarUrl} initials={contact.initials} size={44} isOnline={contact.isOnline} />
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                      {contact.nickname ? `${contact.nickname} (${contact.fullName})` : contact.fullName}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{contact.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            const msg = item.data;
            return (
              <View
                style={[styles.resultRow, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}
              >
                <Text style={styles.msgIcon}>💬</Text>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
                    {msg.text || "Attachment"}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            query.trim().length > 0 && !isSearching ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No contacts or messages found
              </Text>
            ) : null
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  msgIcon: {
    fontSize: 24,
  },
  rowMeta: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});
