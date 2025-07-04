'use client';

import React from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';

interface SidebarProps {
  onPortfolioSelect?: () => void;
}

export default function Sidebar({ onPortfolioSelect }: SidebarProps) {
  const { portfolios, currentPortfolio, setCurrentPortfolio, deletePortfolio, isLoading } = usePortfolioStore();


  const handleSelectPortfolio = (portfolioId: string) => {
    // Find the portfolio in our already-loaded complete portfolios
    const portfolio = portfolios.find(p => p.id === portfolioId);
    
    if (portfolio) {
      console.log('📁 Selected portfolio:', portfolio.title, 'with', portfolio.items.length, 'items');
      setCurrentPortfolio(portfolio);
      
      // Notify parent about portfolio selection (for mobile sidebar close)
      if (onPortfolioSelect) {
        onPortfolioSelect();
      }
    } else {
      console.error('Portfolio not found in loaded portfolios:', portfolioId);
      alert('Portfolio not found. Please try refreshing the page.');
    }
  };

  const handleDeletePortfolio = async (portfolioId: string, portfolioTitle: string) => {
    if (confirm(`Are you sure you want to delete "${portfolioTitle}"? This will delete all sections, items, and files. This action cannot be undone.`)) {
      try {
        // Delete from localStorage first
        deletePortfolio(portfolioId);
        
        // If we deleted the current portfolio, clear it
        if (currentPortfolio?.id === portfolioId) {
          setCurrentPortfolio(null);
        }
        
        // Then delete from database
        await api.deletePortfolio(portfolioId);
        
        // Refresh from database to ensure consistency
        const { loadCompletePortfoliosFromDB } = usePortfolioStore.getState();
        await loadCompletePortfoliosFromDB();
      } catch (error) {
        console.error('Failed to delete portfolio:', error);
        // Refresh from database to restore correct state if deletion failed
        const { loadCompletePortfoliosFromDB } = usePortfolioStore.getState();
        await loadCompletePortfoliosFromDB();
        alert('Failed to delete portfolio. Please try again.');
      }
    }
  };


  return (
    <div className="w-72 bg-gray-50 border-r border-gray-100 h-full overflow-y-auto">
      <div className="p-4 md:p-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4 tracking-wide uppercase">My Portfolios</h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">Loading portfolios...</div>
            </div>
          ) : portfolios.length > 0 ? (
            <div className="space-y-2">
              {portfolios.map((portfolio) => (
                <div 
                  key={portfolio.id} 
                  className={`border rounded-lg p-3 md:p-4 cursor-pointer transition-all duration-200 ${
                    currentPortfolio?.id === portfolio.id 
                      ? 'bg-white border-gray-200 shadow-sm' 
                      : 'bg-transparent border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => handleSelectPortfolio(portfolio.id)}
                    >
                      <h4 className="font-medium text-gray-900 truncate text-sm md:text-base">{portfolio.title}</h4>
                      {portfolio.description && (
                        <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">{portfolio.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 md:mt-3">
                        <p className="text-xs text-gray-400">
                          {new Date(portfolio.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {portfolio.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio.id, portfolio.title);
                      }}
                      className="text-gray-300 hover:text-gray-500 transition-colors text-xs ml-2 md:ml-3 flex-shrink-0"
                      title="Delete portfolio"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 border-2 border-gray-400 rounded border-dashed"></div>
              </div>
              <p className="text-gray-500 text-sm">
                No portfolios yet. Create your first portfolio to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}