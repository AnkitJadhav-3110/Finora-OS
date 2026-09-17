import { create } from 'zustand';
import { Client } from './types';

export interface ClientState {
  clients: Client[];
  setClients: (clients: Client[]) => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],
  setClients: (clients) => set({ clients }),
}));
