import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendTextMessage, sendMediaMessage } from "../api/messages";
import { useChatStore } from "./useChatStore";

const OUTBOX_STORAGE_KEY = "@imessage_outbox_queue";

export interface OutboxItem {
  id: string;
  partnerId: string;
  text?: string;
  replyToId?: string;
  fileUri?: string;
  fileName?: string;
  fileType?: string;
  viewOnce?: boolean;
  createdAt: number;
}

interface OutboxState {
  queue: OutboxItem[];
  isFlushing: boolean;
  addToOutbox: (item: Omit<OutboxItem, "id" | "createdAt">) => Promise<void>;
  removeFromOutbox: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
  flushOutbox: () => Promise<void>;
}

export const useOutboxStore = create<OutboxState>((set, get) => ({
  queue: [],
  isFlushing: false,

  loadQueue: async () => {
    try {
      const data = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
      if (data) {
        set({ queue: JSON.parse(data) });
      }
    } catch (e: any) {
      console.warn("[Outbox] loadQueue error:", e.message);
    }
  },

  addToOutbox: async (item) => {
    const newItem: OutboxItem = {
      ...item,
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: Date.now(),
    };

    const newQueue = [...get().queue, newItem];
    set({ queue: newQueue });
    try {
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(newQueue));
    } catch {}
  },

  removeFromOutbox: async (id) => {
    const newQueue = get().queue.filter((i) => i.id !== id);
    set({ queue: newQueue });
    try {
      await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(newQueue));
    } catch {}
  },

  flushOutbox: async () => {
    const { queue, isFlushing } = get();
    if (isFlushing || queue.length === 0) return;

    set({ isFlushing: true });

    for (const item of [...queue]) {
      try {
        if (item.fileUri) {
          const sent = await sendMediaMessage({
            receiverId: item.partnerId,
            fileUri: item.fileUri,
            fileName: item.fileName,
            fileType: item.fileType,
            text: item.text,
            replyToId: item.replyToId,
            viewOnce: item.viewOnce,
          });
          useChatStore.getState().handleNewMessage(sent);
        } else if (item.text) {
          const sent = await sendTextMessage(item.partnerId, item.text, item.replyToId);
          useChatStore.getState().handleNewMessage(sent);
        }

        // Successfully sent, remove from queue
        await get().removeFromOutbox(item.id);
      } catch (err: any) {
        console.warn(`[Outbox] Failed to send queued message ${item.id}:`, err.message);
        // Break out to retry remaining messages on next flush
        break;
      }
    }

    set({ isFlushing: false });
  },
}));
