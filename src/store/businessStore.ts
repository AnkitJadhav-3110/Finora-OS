import { create } from 'zustand';
import { Business } from './types';

export interface BusinessState {
  businesses: Business[];
  currentBusinessId: string | null;
  setBusinesses: (businesses: Business[]) => void;
  setCurrentBusinessId: (id: string | null) => void;
}

export const useBusinessStore = create<BusinessState>((set) => ({
  businesses: [],
  currentBusinessId: null,
  setBusinesses: (businesses) => set({ businesses }),
  setCurrentBusinessId: (currentBusinessId) => set({ currentBusinessId }),
}));
