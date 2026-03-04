import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Exhibitor {
  id: string;
  name: string;
  stand: string;
  logo: string;
  isPVInstaller: number;
  status: 'New' | 'Contacted' | 'Successful Lead' | 'Rejected';
  notes: string;
}

interface ExhibitorStore {
  // UI State
  searchQuery: string;
  filterStatus: string;
  filterStand: string;
  filterPVOnly: boolean;
  currentPage: number;
  editingExhibitor: Exhibitor | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  setFilterStand: (stand: string) => void;
  setFilterPVOnly: (value: boolean) => void;
  setCurrentPage: (page: number) => void;
  setEditingExhibitor: (exhibitor: Exhibitor | null) => void;
  clearFilters: () => void;
}

export const useExhibitorStore = create<ExhibitorStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        searchQuery: '',
        filterStatus: 'All',
        filterStand: '',
        filterPVOnly: false,
        currentPage: 1,
        editingExhibitor: null,

        // Actions
        setSearchQuery: (query) =>
          set((state) => ({
            ...state,
            searchQuery: query,
            currentPage: 1,
          })),
        setFilterStatus: (status) =>
          set((state) => ({
            ...state,
            filterStatus: status,
            currentPage: 1,
          })),
        setFilterStand: (stand) =>
          set((state) => ({
            ...state,
            filterStand: stand,
            currentPage: 1,
          })),
        setFilterPVOnly: (value) =>
          set((state) => ({
            ...state,
            filterPVOnly: value,
            currentPage: 1,
          })),
        setCurrentPage: (page) => set({ currentPage: page }),
        setEditingExhibitor: (exhibitor) => set({ editingExhibitor: exhibitor }),
        clearFilters: () =>
          set({
            searchQuery: '',
            filterStatus: 'All',
            filterStand: '',
            filterPVOnly: false,
            currentPage: 1,
          }),
      }),
      {
        name: 'exhibitor-store',
      }
    )
  )
);
