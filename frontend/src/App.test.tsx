import { useStore } from './store/useStore';

describe('Zustand Global App Store', () => {
  it('should initialize with default states', () => {
    const state = useStore.getState();
    expect(state.activeTab).toBe('chat');
    expect(state.iotDevice).toBeNull();
    expect(state.warning).toBeNull();
    expect(state.feed).toEqual([]);
  });

  it('should allow setting activeTab state', () => {
    useStore.getState().setActiveTab('calculator');
    expect(useStore.getState().activeTab).toBe('calculator');
  });

  it('should append text correctly to feed items', () => {
    useStore.getState().addFeed('Event test log');
    const feed = useStore.getState().feed;
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].text).toBe('Event test log');
  });
});
