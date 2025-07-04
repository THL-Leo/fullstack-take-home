'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/store/portfolioStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { PortfolioItem } from '@/types/portfolio';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { SectionSelector } from '@/components/forms/SectionSelector';
import { getErrorMessage } from '@/lib/error-handler';

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


export default function EditItemModal({ isOpen, onClose, item, onSuccess }: EditItemModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { currentPortfolio, updateItem, refreshCurrentPortfolio } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormData>();

  // Populate form with item data when modal opens
  useEffect(() => {
    if (isOpen && item) {
      reset({
        title: item.title || '',
        description: item.description || '',
        sectionId: item.sectionId || '',
        newSectionTitle: ''
      });
      setSelectedSectionId(item.sectionId || undefined);
      setNewSectionTitle('');
      setShowNewSectionInput(false);
      setError(null);
    }
  }, [isOpen, item, reset]);

  const handleClose = () => {
    reset();
    setError(null);
    setShowNewSectionInput(false);
    setSelectedSectionId(undefined);
    setNewSectionTitle('');
    onClose();
  };

  const onSubmit = async (data: EditFormData) => {
    if (!item || !currentPortfolio) return;

    setIsSaving(true);
    setError(null);

    try {
      let finalSectionId = selectedSectionId;

      // Create new section if needed
      if (showNewSectionInput && newSectionTitle.trim()) {
        try {
          const newSection = await api.createSection(currentPortfolio.id, {
            title: newSectionTitle.trim(),
            description: ''
          });
          
          console.log('Backend returned section:', newSection);
          finalSectionId = newSection.id;
          console.log('Using section ID:', finalSectionId);
        } catch (error) {
          console.error('Failed to create section:', error);
          setError(getErrorMessage(error));
          return;
        }
      }

      console.log('EditItemModal: Before building updateData:');
      console.log('  selectedSectionId:', selectedSectionId);
      console.log('  finalSectionId:', finalSectionId);

      const updateData = {
        title: data.title,
        description: data.description,
        section_id: finalSectionId || undefined,
      };

      console.log('Sending update data:', updateData);
      await api.updatePortfolioItem(currentPortfolio.id, item.id, updateData);
      
      // Update local state
      updateItem(item.id, {
        title: data.title,
        description: data.description,
        sectionId: finalSectionId || undefined,
      });
      
      // Refresh portfolio data to ensure consistency
      await refreshCurrentPortfolio();
      
      handleClose();
      
      if (onSuccess) onSuccess(finalSectionId || 'unsorted');
    } catch (error) {
      console.error('Failed to update portfolio item:', error);
      setError(getErrorMessage(error));
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
          <ErrorAlert error={error} onClose={() => setError(null)} />
        )}

        {/* Media Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Media Preview</h4>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
            <MediaPreview
              type={item.type}
              url={item.url}
              thumbnailUrl={item.thumbnailUrl}
              thumbnailBase64={item.thumbnailBase64}
              alt={item.title}
              className="absolute inset-0"
            />
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
          <SectionSelector
            key={currentPortfolio?.id || ''}
            portfolioId={currentPortfolio?.id || ''}
            selectedSectionId={selectedSectionId}
            onSectionChange={setSelectedSectionId}
            newSectionTitle={newSectionTitle}
            onNewSectionTitleChange={setNewSectionTitle}
            showNewSectionInput={showNewSectionInput}
            onNewSectionInputToggle={setShowNewSectionInput}
            disabled={isSaving}
          />

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