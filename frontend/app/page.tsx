'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PortfolioView from '@/components/portfolio/PortfolioView';
import { usePortfolioStore } from '@/store/portfolioStore';

export default function Home() {
  const { loadCompletePortfoliosFromDB } = usePortfolioStore();

  // Load fresh complete data from database on app startup
  useEffect(() => {
    loadCompletePortfoliosFromDB();
  }, [loadCompletePortfoliosFromDB]);

  const handlePortfolioChange = () => {
    // Refresh portfolios from database
    loadCompletePortfoliosFromDB();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onPortfolioChange={handlePortfolioChange} />
      
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <PortfolioView />
          </div>
        </main>
      </div>
    </div>
  );
}
