import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Portfolio, Section, PortfolioItem, PortfolioCreate, SectionCreate } from '@/types/portfolio';

interface PortfolioStore {
  // State
  currentPortfolio: Portfolio | null;
  portfolios: Portfolio[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentPortfolio: (portfolio: Portfolio | null) => void;
  addPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => void;
  deletePortfolio: (id: string) => void;
  
  // Section actions
  addSection: (section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  toggleSection: (id: string) => void;
  
  // Item actions
  addItem: (item: PortfolioItem) => void;
  updateItem: (id: string, updates: Partial<PortfolioItem>) => void;
  deleteItem: (id: string) => void;
  moveItem: (itemId: string, targetSectionId: string, newOrder: number) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPortfolio: null,
      portfolios: [],
      isLoading: false,
      error: null,

      // Portfolio actions
      setCurrentPortfolio: (portfolio) => set({ currentPortfolio: portfolio }),
      
      addPortfolio: (portfolio) => set((state) => ({
        portfolios: [...state.portfolios, portfolio],
        currentPortfolio: portfolio
      })),
      
      updatePortfolio: (id, updates) => set((state) => ({
        portfolios: state.portfolios.map(p => 
          p.id === id ? { ...p, ...updates } : p
        ),
        currentPortfolio: state.currentPortfolio?.id === id 
          ? { ...state.currentPortfolio, ...updates }
          : state.currentPortfolio
      })),
      
      deletePortfolio: (id) => set((state) => ({
        portfolios: state.portfolios.filter(p => p.id !== id),
        currentPortfolio: state.currentPortfolio?.id === id 
          ? null 
          : state.currentPortfolio
      })),

      // Section actions
      addSection: (section) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          sections: [...state.currentPortfolio.sections, section]
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      updateSection: (id, updates) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          sections: state.currentPortfolio.sections.map(s => 
            s.id === id ? { ...s, ...updates } : s
          )
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      deleteSection: (id) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          sections: state.currentPortfolio.sections.filter(s => s.id !== id),
          items: state.currentPortfolio.items.filter(i => i.sectionId !== id)
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      toggleSection: (id) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          sections: state.currentPortfolio.sections.map(s => 
            s.id === id ? { ...s, isExpanded: !s.isExpanded } : s
          )
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),

      // Item actions
      addItem: (item) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          items: [...state.currentPortfolio.items, item]
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      updateItem: (id, updates) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          items: state.currentPortfolio.items.map(i => 
            i.id === id ? { ...i, ...updates } : i
          )
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      deleteItem: (id) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          items: state.currentPortfolio.items.filter(i => i.id !== id)
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),
      
      moveItem: (itemId, targetSectionId, newOrder) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          items: state.currentPortfolio.items.map(i => 
            i.id === itemId 
              ? { ...i, sectionId: targetSectionId, order: newOrder }
              : i
          )
        };
        
        return {
          currentPortfolio: updatedPortfolio,
          portfolios: state.portfolios.map(p => 
            p.id === updatedPortfolio.id ? updatedPortfolio : p
          )
        };
      }),

      // Utility actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        currentPortfolio: state.currentPortfolio,
        portfolios: state.portfolios
      })
    }
  )
);