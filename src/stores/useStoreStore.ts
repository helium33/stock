import { create } from 'zustand';
import { Store } from '../lib/utils';

interface StoreState {
  currentStore: Store;
  setCurrentStore: (store: Store) => void;
}

const useStoreStore = create<StoreState>((set) => ({
  currentStore: 'win',
  setCurrentStore: (store) => set({ currentStore: store }),
}));

export default useStoreStore;