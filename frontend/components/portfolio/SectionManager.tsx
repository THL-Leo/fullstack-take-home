'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface SectionFormData {
  name: string;
  description: string;
}

export default function SectionManager() {
  const [isCreating, setIsCreating] = useState(false);
  const { currentPortfolio, addSection, deleteSection } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SectionFormData>();

  const onSubmit = async (data: SectionFormData) => {
    if (!currentPortfolio) return;

    try {
      const sectionData = {
        name: data.name,
        description: data.description || undefined,
        order: currentPortfolio.sections.length
      };

      const newSection = await api.createSection(currentPortfolio.id, sectionData);
      
      addSection({
        ...newSection,
        id: newSection._id || newSection.id,
        isExpanded: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      reset();
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create section:', error);
      alert('Failed to create section. Please try again.');
    }
  };

  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    if (!currentPortfolio) return;
    
    if (confirm(`Are you sure you want to delete the section "${sectionName}"? This will also delete all items in this section. This action cannot be undone.`)) {
      try {
        // Delete from localStorage first
        deleteSection(sectionId);
        
        // Then delete from database
        await api.deleteSection(currentPortfolio.id, sectionId);
        
        // Refresh from database to ensure consistency
        const { refreshCurrentPortfolio } = usePortfolioStore.getState();
        await refreshCurrentPortfolio();
      } catch (error) {
        console.error('Failed to delete section:', error);
        // Refresh from database to restore correct state if deletion failed
        const { refreshCurrentPortfolio } = usePortfolioStore.getState();
        await refreshCurrentPortfolio();
        alert('Failed to delete section. Please try again.');
      }
    }
  };

  if (!currentPortfolio) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Portfolio Sections</h3>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            Add Section
          </Button>
        )}
      </div>

      {/* Section List */}
      <div className="space-y-2">
        {currentPortfolio.sections.map((section) => (
          <div key={section.id} className="border rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{section.name}</h4>
                {section.description && (
                  <p className="text-sm text-gray-600">{section.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">
                  {currentPortfolio.items.filter(item => item.sectionId === section.id).length} items
                </div>
                <button
                  onClick={() => handleDeleteSection(section.id, section.name)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="Delete section"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {currentPortfolio.sections.length === 0 && !isCreating && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <p>No sections yet. Create your first section to start organizing your portfolio.</p>
          </div>
        )}
      </div>

      {/* Create Section Form */}
      {isCreating && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-3 text-gray-900">Create New Section</h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input
              label="Section Name *"
              {...register('name', { required: 'Section name is required' })}
              error={errors.name?.message}
              placeholder="e.g., Photography, Web Design, Videos"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Brief description of this section (optional)"
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit" size="sm">Create Section</Button>
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
      )}
    </div>
  );
}