import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Portfolio, PortfolioItem, PortfolioCreate } from '@/types/portfolio';
import { api } from '@/lib/api';

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
  
  // Item actions
  addItem: (item: PortfolioItem) => void;
  updateItem: (id: string, updates: Partial<PortfolioItem>) => void;
  deleteItem: (id: string) => void;
  reorderItem: (itemId: string, newOrder: number) => void;
  
  // Database sync actions
  loadCompletePortfoliosFromDB: () => Promise<void>;
  refreshCurrentPortfolio: () => Promise<void>;
  
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
      
      reorderItem: (itemId, newOrder) => set((state) => {
        if (!state.currentPortfolio) return state;
        
        const updatedPortfolio = {
          ...state.currentPortfolio,
          items: state.currentPortfolio.items.map(i => 
            i.id === itemId 
              ? { ...i, order: newOrder }
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

      // Database sync actions
      loadCompletePortfoliosFromDB: async () => {
        const { currentPortfolio } = get();
        set({ isLoading: true, error: null });
        try {
          console.log('🔄 Loading fresh complete portfolios from database...');
          
          // Fetch all complete portfolios with items and sections
          const completePortfolios = await api.getAllCompletePortfolios();
          
          console.log('✅ Loaded complete portfolios:', completePortfolios.length);
          
          const validPortfolios = completePortfolios.filter((p): p is Portfolio => p !== null);
          
          // Try to preserve current portfolio if it still exists
          let updatedCurrentPortfolio = null;
          if (currentPortfolio) {
            const foundPortfolio = validPortfolios.find(p => p.id === currentPortfolio.id);
            if (foundPortfolio) {
              updatedCurrentPortfolio = foundPortfolio;
              console.log('✅ Preserved current portfolio:', foundPortfolio.title);
            } else {
              console.log('⚠️ Current portfolio no longer exists, clearing selection');
            }
          }
          
          set({ 
            portfolios: validPortfolios, 
            currentPortfolio: updatedCurrentPortfolio,
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to load complete portfolios from database:', error);
          set({ error: 'Failed to load portfolios', isLoading: false });
        }
      },

      refreshCurrentPortfolio: async () => {
        const { currentPortfolio } = get();
        if (!currentPortfolio) return;
        
        set({ isLoading: true, error: null });
        try {
          const refreshedPortfolio = await api.getPortfolio(currentPortfolio.id) as Portfolio;
          set({ 
            currentPortfolio: refreshedPortfolio,
            portfolios: get().portfolios.map(p => 
              p.id === refreshedPortfolio.id ? refreshedPortfolio : p
            ),
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to refresh current portfolio:', error);
          set({ error: 'Failed to refresh portfolio', isLoading: false });
        }
      },

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