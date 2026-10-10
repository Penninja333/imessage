import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuthStore } from "../store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, "Conversations">;

export const ConversationsScreen: React.FC<Props> = ({ navigation }) => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { colors } = useAppTheme();
  const { authUser, syncAuthUser, clearAuth } = useAuthStore();

  useEffect(() => {
    syncAuthUser();
  }, [syncAuthUser]);

  const handleSignOut = async () => {
    clearAuth();
    await signOut();
  };

  const displayName =
    authUser?.fullName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Me";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* iOS-style Large Title Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleSignOut} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: colors.accent }]}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Contacts")} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: colors.accent, fontWeight: "600" }]}>
              New
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.largeTitle, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.profileSubtitle, { color: colors.textMuted }]}>
          Logged in as {displayName}
        </Text>
      </View>

      <View style={styles.emptyContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
          <Text style={styles.emptyIcon}>💬</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversations Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Tap New above to start a conversation with any registered contact.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 16,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  profileSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
