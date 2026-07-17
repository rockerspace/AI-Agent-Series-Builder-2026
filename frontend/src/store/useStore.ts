import { create } from 'zustand';

interface FeedItem {
  id: number;
  text: string;
  time: string;
}

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  iotDevice: any;
  setIotDevice: (device: any) => void;
  warning: any;
  setWarning: (warning: any) => void;
  feed: FeedItem[];
  addFeed: (text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
  iotDevice: null,
  setIotDevice: (device) => set({ iotDevice: device }),
  warning: null,
  setWarning: (warning) => set({ warning }),
  feed: [],
  addFeed: (text) => set((state) => ({
    feed: [
      { id: Date.now() + Math.random(), text, time: new Date().toLocaleTimeString() },
      ...state.feed.slice(0, 4)
    ]
  }))
}));
