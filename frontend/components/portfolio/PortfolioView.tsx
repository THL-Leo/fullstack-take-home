'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import FileUpload from './FileUpload';
import Button from '@/components/ui/Button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PortfolioView() {
  const [activeUploadSection, setActiveUploadSection] = useState<string | null>(null);
  const { currentPortfolio, toggleSection, deleteItem } = usePortfolioStore();

  const handleDeleteItem = async (itemId: string) => {
    if (!currentPortfolio) return;
    
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await api.deletePortfolioItem(currentPortfolio.id, itemId);
        // Update local store
        deleteItem(itemId);
        
        // Refresh portfolio data from server to ensure consistency
        const refreshedPortfolio = await api.getPortfolio(currentPortfolio.id);
        const { setCurrentPortfolio } = usePortfolioStore.getState();
        setCurrentPortfolio(refreshedPortfolio);
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  if (!currentPortfolio) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">No Portfolio Selected</h2>
        <p className="text-gray-600">Create or select a portfolio to get started.</p>
      </div>
    );
  }

  const getItemsForSection = (sectionId: string) => {
    return currentPortfolio.items
      .filter(item => item.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentPortfolio.title}</h1>
            {currentPortfolio.description && (
              <p className="text-gray-600 mt-1">{currentPortfolio.description}</p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {currentPortfolio.sections.length} sections • {currentPortfolio.items.length} items
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {currentPortfolio.sections.map((section) => {
          const sectionItems = getItemsForSection(section.id);
          const isUploading = activeUploadSection === section.id;

          return (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border">
              {/* Section Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {section.isExpanded ? '▼' : '▶'}
                    </button>
                    <div>
                      <h3 className="font-medium text-gray-900">{section.name}</h3>
                      {section.description && (
                        <p className="text-sm text-gray-600">{section.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {sectionItems.length} items
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveUploadSection(
                        isUploading ? null : section.id
                      )}
                    >
                      {isUploading ? 'Cancel' : 'Add Item'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Section Content */}
              {section.isExpanded && (
                <div className="p-4">
                  {/* Upload Component */}
                  {isUploading && (
                    <div className="mb-6">
                      <FileUpload
                        sectionId={section.id}
                        onSuccess={() => setActiveUploadSection(null)}
                      />
                    </div>
                  )}

                  {/* Items Grid */}
                  {sectionItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionItems.map((item) => {
                        console.log('Rendering item:', item.title, 'Type:', item.type);
                        return (
                        <div key={item.id} className="border rounded-lg overflow-hidden">
                          {/* Media Preview */}
                          <div className="aspect-video bg-gray-100 flex items-center justify-center">
                            {item.type === 'image' ? (
                              <img
                                src={item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const fallbackSrc = `${API_BASE_URL}/uploads/${item.filename}`;
                                  console.error('Image failed to load:', e.currentTarget.src);
                                  console.error('Trying fallback:', fallbackSrc);
                                  console.error('Item data:', item);
                                  e.currentTarget.src = fallbackSrc;
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully!');
                                }}
                              />
                            ) : (
                              <div className="relative w-full h-full">
                                {item.thumbnailUrl ? (
                                  <img
                                    src={`${API_BASE_URL}${item.thumbnailUrl}`}
                                    alt={`${item.title} thumbnail`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center flex items-center justify-center h-full">
                                    <div>
                                      <div className="text-4xl mb-2">🎥</div>
                                      <p className="text-sm text-gray-600">Video File</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-gray-900 flex-1">{item.title}</h4>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-500 hover:text-red-700 transition-colors ml-2 p-1"
                                title="Delete item"
                              >
                                🗑️
                              </button>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{item.originalName}</span>
                              <span>
                                {item.metadata.dimensions && 
                                  `${item.metadata.dimensions.width}×${item.metadata.dimensions.height}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : !isUploading ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-3xl mb-2">📷</div>
                      <p>No items in this section yet.</p>
                      <p className="text-sm">Click "Add Item" to upload your first file.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {currentPortfolio.sections.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sections Yet</h3>
            <p className="text-gray-600 mb-4">
              Create sections to organize your portfolio items by category or theme.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}