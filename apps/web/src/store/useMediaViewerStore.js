import { create } from "zustand";

export const useMediaViewerStore = create((set, get) => ({
  isOpen: false,
  activeMedia: null, // { id, url, type: 'image' | 'video', text, time, senderName }
  mediaList: [],
  currentIndex: 0,

  openMedia: ({ media, mediaList = [] }) => {
    let list = Array.isArray(mediaList) && mediaList.length > 0 ? [...mediaList] : [media];
    let index = list.findIndex(
      (item) => (media.id && item.id === media.id) || item.url === media.url
    );

    if (index === -1) {
      list = [media, ...list];
      index = 0;
    }

    set({
      isOpen: true,
      activeMedia: list[index],
      mediaList: list,
      currentIndex: index,
    });
  },

  closeMedia: () => {
    set({
      isOpen: false,
      activeMedia: null,
      mediaList: [],
      currentIndex: 0,
    });
  },

  nextMedia: () => {
    const { mediaList, currentIndex } = get();
    if (currentIndex < mediaList.length - 1) {
      const nextIndex = currentIndex + 1;
      set({
        currentIndex: nextIndex,
        activeMedia: mediaList[nextIndex],
      });
    }
  },

  prevMedia: () => {
    const { mediaList, currentIndex } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      set({
        currentIndex: prevIndex,
        activeMedia: mediaList[prevIndex],
      });
    }
  },

  setCurrentIndex: (index) => {
    const { mediaList } = get();
    if (index >= 0 && index < mediaList.length) {
      set({
        currentIndex: index,
        activeMedia: mediaList[index],
      });
    }
  },
}));
