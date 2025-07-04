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
  const { sections, loading } = useFormSections({
    portfolioId,
    onError: setError,
  });

  const handleSectionSelectChange = (value: string) => {
    if (value === 'new') {
      onNewSectionInputToggle?.(true);
      onSectionChange(undefined);
    } else {
      onNewSectionInputToggle?.(false);
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
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            value={showNewSectionInput ? 'new' : selectedSectionId || ''}
            onChange={(e) => handleSectionSelectChange(e.target.value)}
            disabled={disabled}
          >
            {!selectedSectionId && <option value="" disabled>Choose a section</option>}
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
            <option key="new-section" value="new">+ Create new section</option>
          </select>
        )}
      </div>

      {showNewSectionInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Section Title
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            value={newSectionTitle}
            onChange={(e) => onNewSectionTitleChange?.(e.target.value)}
            placeholder="Enter section title"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};