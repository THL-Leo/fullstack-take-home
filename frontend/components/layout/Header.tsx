'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface PortfolioFormData {
  title: string;
  description: string;
}

interface HeaderProps {
  onPortfolioChange?: () => void;
}

export default function Header({ onPortfolioChange }: HeaderProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { currentPortfolio, setCurrentPortfolio, addPortfolio, deletePortfolio } = usePortfolioStore();
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
      setIsCreating(false);
      
      // Notify sidebar to refresh
      if (onPortfolioChange) {
        onPortfolioChange();
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      alert('Failed to create portfolio. Please try again.');
    }
  };

  const handleDeletePortfolio = async () => {
    if (!currentPortfolio) return;
    
    if (confirm(`Are you sure you want to delete "${currentPortfolio.title}"? This will delete all items and files. This action cannot be undone.`)) {
      try {
        await api.deletePortfolio(currentPortfolio.id);
        deletePortfolio(currentPortfolio.id);
        setCurrentPortfolio(null);
        
        // Notify sidebar to refresh
        if (onPortfolioChange) {
          onPortfolioChange();
        }
      } catch (error) {
        console.error('Failed to delete portfolio:', error);
        alert('Failed to delete portfolio. Please try again.');
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🎨</div>
            <h1 className="text-xl font-semibold text-gray-900">Portfolio Manager</h1>
            {currentPortfolio && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">•</div>
                <div className="text-sm font-medium text-gray-700">{currentPortfolio.title}</div>
                <button
                  onClick={handleDeletePortfolio}
                  className="text-red-500 hover:text-red-700 transition-colors text-sm ml-2"
                  title="Delete portfolio"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {!isCreating ? (
              <Button onClick={() => setIsCreating(true)}>
                New Portfolio
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Create Portfolio Form */}
        {isCreating && (
          <div className="pb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-3">Create New Portfolio</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div className="flex space-x-2">
                  <Button type="submit" size="sm">Create Portfolio</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}