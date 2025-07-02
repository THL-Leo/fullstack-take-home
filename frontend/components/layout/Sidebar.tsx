'use client';

import { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import SectionManager from '@/components/portfolio/SectionManager';

interface SidebarProps {
  refreshTrigger?: number;
}

export default function Sidebar({ refreshTrigger }: SidebarProps) {
  const { portfolios, currentPortfolio, setCurrentPortfolio, deletePortfolio } = usePortfolioStore();
  const [allPortfolios, setAllPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'portfolios' | 'sections'>('portfolios');

  // Load portfolios from server on mount and when refresh trigger changes
  useEffect(() => {
    loadPortfolios();
  }, [refreshTrigger]);

  // Reset view to portfolios when current portfolio is cleared
  useEffect(() => {
    if (!currentPortfolio) {
      setView('portfolios');
    }
  }, [currentPortfolio]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const serverPortfolios = await api.listPortfolios();
      setAllPortfolios(serverPortfolios);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPortfolio = async (portfolioId: string) => {
    try {
      const portfolio = await api.getPortfolio(portfolioId);
      setCurrentPortfolio(portfolio);
      setView('sections');
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      alert('Failed to load portfolio. Please try again.');
    }
  };

  const handleDeletePortfolio = async (portfolioId: string, portfolioTitle: string) => {
    if (confirm(`Are you sure you want to delete "${portfolioTitle}"? This will delete all sections, items, and files. This action cannot be undone.`)) {
      try {
        await api.deletePortfolio(portfolioId);
        deletePortfolio(portfolioId);
        
        // If we deleted the current portfolio, clear it
        if (currentPortfolio?.id === portfolioId) {
          setCurrentPortfolio(null);
          setView('portfolios');
        }
        
        // Refresh the portfolio list
        await loadPortfolios();
      } catch (error) {
        console.error('Failed to delete portfolio:', error);
        alert('Failed to delete portfolio. Please try again.');
      }
    }
  };

  const handleBackToPortfolios = () => {
    setView('portfolios');
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {view === 'portfolios' ? (
          /* Portfolio List View */
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">My Portfolios</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading portfolios...</div>
              </div>
            ) : allPortfolios.length > 0 ? (
              <div className="space-y-2">
                {allPortfolios.map((portfolio) => (
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
                        <p className="text-xs text-gray-500 mt-1">
                          Created {new Date(portfolio.created_at).toLocaleDateString()}
                        </p>
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
        ) : (
          /* Section Management View */
          <div>
            <div className="flex items-center mb-4">
              <button
                onClick={handleBackToPortfolios}
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
              >
                ← Back to Portfolios
              </button>
            </div>
            
            {currentPortfolio && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">{currentPortfolio.title}</h3>
                {currentPortfolio.description && (
                  <p className="text-sm text-gray-600">{currentPortfolio.description}</p>
                )}
              </div>
            )}
            
            <SectionManager />
          </div>
        )}
      </div>
    </div>
  );
}