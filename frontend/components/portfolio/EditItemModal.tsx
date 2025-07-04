'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/store/portfolioStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Section, PortfolioItem } from '@/types/portfolio';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PortfolioItem | null;
  onSuccess?: (targetSectionId?: string) => void;
}

interface EditFormData {
  title: string;
  description: string;
  sectionId: string;
  newSectionTitle: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EditItemModal({ isOpen, onClose, item, onSuccess }: EditItemModalProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { currentPortfolio, updateItem, refreshCurrentPortfolio } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<EditFormData>();
  
  const selectedSectionId = watch('sectionId');

  // Load sections when modal opens
  useEffect(() => {
    if (isOpen && currentPortfolio) {
      const loadSections = async () => {
        try {
          const sectionsData = await api.listSections(currentPortfolio.id);
          setSections(sectionsData as Section[]);
        } catch (error) {
          console.error('Failed to load sections:', error);
          setSections([]);
        }
      };
      loadSections();
    }
  }, [isOpen, currentPortfolio]);

  // Populate form with item data when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setValue('title', item.title || '');
      setValue('description', item.description || '');
      setValue('sectionId', item.sectionId || 'unsorted');
      setValue('newSectionTitle', '');
      setIsCreatingNewSection(false);
      setError(null);
    }
  }, [isOpen, item, setValue]);

  const handleClose = () => {
    reset();
    setError(null);
    setIsCreatingNewSection(false);
    onClose();
  };

  const onSubmit = async (data: EditFormData) => {
    if (!item || !currentPortfolio) return;

    setIsSaving(true);
    setError(null);

    try {
      let sectionId = data.sectionId;

      // Create new section if needed
      if (data.sectionId === 'new' && data.newSectionTitle.trim()) {
        const newSection = await api.createSection(currentPortfolio.id, {
          title: data.newSectionTitle.trim(),
          order: sections.length
        });
        sectionId = newSection.id || newSection._id;
      }

      const updateData = {
        title: data.title,
        description: data.description,
        section_id: sectionId !== 'unsorted' ? sectionId : undefined,
      };

      await api.updatePortfolioItem(currentPortfolio.id, item.id, updateData);
      
      // Update local state
      updateItem(item.id, {
        title: data.title,
        description: data.description,
        sectionId: sectionId !== 'unsorted' ? sectionId : undefined,
      });
      
      // Refresh portfolio data to ensure consistency
      await refreshCurrentPortfolio();
      
      handleClose();
      
      if (onSuccess) onSuccess(sectionId !== 'unsorted' ? sectionId : 'unsorted');
    } catch (error) {
      console.error('Failed to update portfolio item:', error);
      setError('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Edit Item" 
      size="lg"
    >
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-300 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="text-gray-900 font-medium text-sm">Error</h4>
                <p className="text-gray-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Media Preview</h4>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {item.type === 'image' ? (
              <img
                src={item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`}
                alt={item.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const fallbackSrc = `${API_BASE_URL}/uploads/${item.filename}`;
                  e.currentTarget.src = fallbackSrc;
                }}
              />
            ) : (
              <div className="relative w-full h-full">
                {item.thumbnailBase64 ? (
                  <div className="relative">
                    <img
                      src={`data:image/jpeg;base64,${item.thumbnailBase64}`}
                      alt={`${item.title} thumbnail`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black bg-opacity-50 rounded-full p-3">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎥</div>
                    <p className="text-sm text-gray-600">Video File</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* File Info */}
          <div className="mt-3 text-sm text-gray-600">
            <p className="font-medium">{item.originalName}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.type === 'image' ? 'Image' : 'Video'} • {item.filename}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title *"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            placeholder="Enter a title for this item"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-400 transition-colors"
              rows={3}
              placeholder="Add a description (optional)"
            />
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              {...register('sectionId')}
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors"
              onChange={(e) => {
                setValue('sectionId', e.target.value);
                setIsCreatingNewSection(e.target.value === 'new');
              }}
            >
              <option value="unsorted">Unsorted</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
              <option value="new">+ Create New Section</option>
            </select>
          </div>

          {/* New Section Input */}
          {isCreatingNewSection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Section Title *
              </label>
              <Input
                {...register('newSectionTitle', { 
                  required: isCreatingNewSection ? 'Section title is required' : false 
                })}
                error={errors.newSectionTitle?.message}
                placeholder="Enter section name"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}