'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface PortfolioFormData {
  title: string;
  description: string;
}

interface HeaderProps {
  onPortfolioChange?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Header({ onPortfolioChange, onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setCurrentPortfolio, addPortfolio } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PortfolioFormData>();

  const onSubmit = async (data: PortfolioFormData) => {
    try {
      const newPortfolio = await api.createPortfolio({
        title: data.title,
        description: data.description || undefined
      });
      
      const portfolioData = {
        ...newPortfolio,
        id: newPortfolio._id || newPortfolio.id,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      addPortfolio(portfolioData);
      setCurrentPortfolio(portfolioData);
      
      reset();
      setIsModalOpen(false);
      
      // Notify sidebar to refresh
      if (onPortfolioChange) {
        onPortfolioChange();
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      alert('Failed to create portfolio. Please try again.');
    }
  };

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="flex">
        {/* Left section aligned with sidebar */}
        <div className="w-72 hidden md:flex items-center px-4 md:px-6 h-16">
          <h1 className="text-lg md:text-xl font-medium text-black tracking-tight">Portfolio Manager</h1>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:hidden">
              {/* Mobile Menu Button */}
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="p-2 -ml-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-label="Toggle sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSidebarOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
              
              <h1 className="text-lg font-medium text-black tracking-tight">Portfolio Manager</h1>
            </div>

            {/* Right side - New Portfolio button */}
            <div className="flex items-center space-x-3 ml-auto">
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                <span className="hidden sm:inline">New Portfolio</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Portfolio Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }} 
        title="Create New Portfolio"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <Input
              label="Portfolio Title *"
              {...register('title', { required: 'Title is required' })}
              error={errors.title?.message}
              placeholder="My Creative Portfolio"
            />
            <Input
              label="Description"
              {...register('description')}
              placeholder="Brief description (optional)"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button type="submit" size="sm">Create Portfolio</Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}