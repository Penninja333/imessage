import React from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAppTheme } from "../theme/ThemeContext";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

export const ChatRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, peerName } = route.params;
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.accent }]}>‹ Messages</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{peerName || "Chat"}</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Chat Room {conversationId}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 17,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
  },
});
