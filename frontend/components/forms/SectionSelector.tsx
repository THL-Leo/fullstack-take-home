import React, { useState } from 'react';
import { useFormSections } from '@/hooks/useFormSections';
import { ErrorAlert } from '@/components/ui/ErrorAlert';

interface SectionSelectorProps {
  portfolioId: string;
  selectedSectionId?: string;
  onSectionChange: (sectionId: string | undefined) => void;
  newSectionTitle?: string;
  onNewSectionTitleChange?: (title: string) => void;
  showNewSectionInput?: boolean;
  onNewSectionInputToggle?: (show: boolean) => void;
  disabled?: boolean;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  portfolioId,
  selectedSectionId,
  onSectionChange,
  newSectionTitle = '',
  onNewSectionTitleChange,
  showNewSectionInput = false,
  onNewSectionInputToggle,
  disabled = false,
}) => {
  const [error, setError] = useState<string>('');
  const { sections, loading, creating, createSection } = useFormSections({
    portfolioId,
    onError: setError,
  });

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      setError('Section title is required');
      return;
    }

    try {
      const newSection = await createSection(newSectionTitle.trim());
      onSectionChange(newSection.id);
      onNewSectionTitleChange?.('');
      onNewSectionInputToggle?.(false);
      setError('');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleSectionSelectChange = (value: string) => {
    if (value === 'new') {
      onNewSectionInputToggle?.(true);
      onSectionChange(undefined);
    } else if (value === '') {
      onSectionChange(undefined);
    } else {
      onSectionChange(value);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorAlert error={error} onClose={() => setError('')} />}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Section
        </label>
        
        {loading ? (
          <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
        ) : (
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={showNewSectionInput ? 'new' : selectedSectionId || ''}
            onChange={(e) => handleSectionSelectChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
            <option value="new">+ Create new section</option>
          </select>
        )}
      </div>

      {showNewSectionInput && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Section Title
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newSectionTitle}
              onChange={(e) => onNewSectionTitleChange?.(e.target.value)}
              placeholder="Enter section title"
              disabled={disabled || creating}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateSection}
              disabled={disabled || creating || !newSectionTitle.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Section'}
            </button>
            <button
              type="button"
              onClick={() => {
                onNewSectionInputToggle?.(false);
                onNewSectionTitleChange?.('');
              }}
              disabled={disabled || creating}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};