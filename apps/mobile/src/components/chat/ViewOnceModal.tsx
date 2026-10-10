import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, SafeAreaView } from "react-native";
import { Image } from "expo-image";

interface Props {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");

export const ViewOnceModal: React.FC<Props> = ({ visible, imageUrl, onClose }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeNumber}>1</Text>
              </View>
              <Text style={styles.badgeText}>View Once Photo</Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <Text style={styles.loadingText}>Loading photo...</Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.hintText}>Photo will close and expire after viewing</Text>
          </View>
        </SafeAreaView>
      </View>
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  badgeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeNumber: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width,
    height: height * 0.75,
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  hintText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
});
