'use client';

import React from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';

export default function Sidebar() {
  const { portfolios, currentPortfolio, setCurrentPortfolio, deletePortfolio, isLoading } = usePortfolioStore();


  const handleSelectPortfolio = (portfolioId: string) => {
    // Find the portfolio in our already-loaded complete portfolios
    const portfolio = portfolios.find(p => p.id === portfolioId);
    
    if (portfolio) {
      console.log('📁 Selected portfolio:', portfolio.title, 'with', portfolio.items.length, 'items');
      setCurrentPortfolio(portfolio);
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
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">My Portfolios</h3>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading portfolios...</div>
            </div>
          ) : portfolios.length > 0 ? (
            <div className="space-y-2">
              {portfolios.map((portfolio) => (
                <div 
                  key={portfolio.id} 
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    currentPortfolio?.id === portfolio.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => handleSelectPortfolio(portfolio.id)}
                    >
                      <h4 className="font-medium text-gray-900">{portfolio.title}</h4>
                      {portfolio.description && (
                        <p className="text-sm text-gray-600 mt-1">{portfolio.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          Created {new Date(portfolio.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {portfolio.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio.id, portfolio.title);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-1 ml-2"
                      title="Delete portfolio"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600 text-sm">
                No portfolios yet. Create your first portfolio to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}