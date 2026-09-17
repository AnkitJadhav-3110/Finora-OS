import { create } from 'zustand';
import { Organization, OrganizationMember } from './types';

export interface OrganizationState {
  organizations: Organization[];
  memberships: OrganizationMember[];
  currentOrgId: string | null;
  setOrganizations: (orgs: Organization[]) => void;
  setMemberships: (memberships: OrganizationMember[]) => void;
  setCurrentOrgId: (id: string | null) => void;
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  memberships: [],
  currentOrgId: null,
  setOrganizations: (organizations) => set({ organizations }),
  setMemberships: (memberships) => set({ memberships }),
  setCurrentOrgId: (currentOrgId) => set({ currentOrgId }),
}));
