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
}

export default function Header({ onPortfolioChange }: HeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-medium text-black tracking-tight">Portfolio Manager</h1>
          </div>

          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              New Portfolio
            </Button>
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
      </div>
    </header>
  );
}