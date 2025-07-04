'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PortfolioView from '@/components/portfolio/PortfolioView';
import { usePortfolioStore } from '@/store/portfolioStore';

export default function Home() {
  const { loadCompletePortfoliosFromDB } = usePortfolioStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load fresh complete data from database on app startup
  useEffect(() => {
    loadCompletePortfoliosFromDB();
  }, [loadCompletePortfoliosFromDB]);

  const handlePortfolioChange = () => {
    // Refresh portfolios from database (for create/delete operations)
    loadCompletePortfoliosFromDB();
  };

  const handlePortfolioSelect = () => {
    // Close sidebar on mobile after selection (no need to refresh all portfolios)
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onPortfolioChange={handlePortfolioChange}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed md:relative z-50 md:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar onPortfolioSelect={handlePortfolioSelect} />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="p-4 md:p-6">
            <PortfolioView />
          </div>
        </main>
      </div>
    </div>
  );
}
