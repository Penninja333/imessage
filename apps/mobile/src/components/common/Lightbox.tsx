import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, SafeAreaView } from "react-native";
import { Image } from "expo-image";

interface Props {
  visible: boolean;
  imageUrl?: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");

export const Lightbox: React.FC<Props> = ({ visible, imageUrl, onClose }) => {
  if (!visible || !imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕ Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height * 0.8,
  },
});
