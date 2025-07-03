'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PortfolioView from '@/components/portfolio/PortfolioView';
import { usePortfolioStore } from '@/store/portfolioStore';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { loadCompletePortfoliosFromDB } = usePortfolioStore();

  // Load fresh complete data from database on app startup
  useEffect(() => {
    loadCompletePortfoliosFromDB();
  }, [loadCompletePortfoliosFromDB]);

  const handlePortfolioChange = () => {
    // Trigger sidebar refresh by incrementing the counter
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onPortfolioChange={handlePortfolioChange} />
      
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar refreshTrigger={refreshTrigger} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <PortfolioView />
          </div>
        </main>
      </div>
    </div>
  );
}
