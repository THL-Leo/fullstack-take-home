'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import UploadModal from './UploadModal';
import Button from '@/components/ui/Button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PortfolioView() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { currentPortfolio, deleteItem, refreshCurrentPortfolio } = usePortfolioStore();

  const handleDeleteItem = async (itemId: string) => {
    if (!currentPortfolio) return;
    
    // Debug and validate IDs
    console.log('Delete item called with:', { itemId, portfolioId: currentPortfolio.id });
    
    if (!itemId || itemId === 'undefined') {
      console.error('Invalid item ID:', itemId);
      alert('Cannot delete item: Invalid item ID');
      return;
    }
    
    if (!currentPortfolio.id || currentPortfolio.id === 'undefined') {
      console.error('Invalid portfolio ID:', currentPortfolio.id);
      alert('Cannot delete item: Invalid portfolio ID');
      return;
    }
    
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        // Delete from localStorage first
        deleteItem(itemId);
        
        // Then delete from database
        await api.deletePortfolioItem(currentPortfolio.id, itemId);
        
        // Refresh from database to ensure consistency
        const { refreshCurrentPortfolio } = usePortfolioStore.getState();
        await refreshCurrentPortfolio();
      } catch (error) {
        console.error('Failed to delete item:', error);
        // Refresh from database to restore correct state if deletion failed
        const { refreshCurrentPortfolio } = usePortfolioStore.getState();
        await refreshCurrentPortfolio();
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    if (!currentPortfolio) return;
    
    console.log('🗑️ Attempting to delete section:', { 
      sectionId, 
      sectionName, 
      portfolioId: currentPortfolio.id 
    });
    
    if (confirm(`Are you sure you want to delete the section "${sectionName}"? This will also delete all items in this section. This action cannot be undone.`)) {
      try {
        console.log('💬 User confirmed deletion, calling API...');
        const response = await api.deleteSection(currentPortfolio.id, sectionId);
        console.log('✅ Delete section API response:', response);
        
        console.log('🔄 Refreshing portfolio...');
        await refreshCurrentPortfolio();
        console.log('✅ Portfolio refreshed successfully');
      } catch (error) {
        console.error('❌ Failed to delete section:', error);
        alert('Failed to delete section. Please try again.');
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

  const sortedItems = currentPortfolio?.items?.sort((a, b) => a.order - b.order) || [];
  const sortedSections = currentPortfolio?.sections?.sort((a, b) => a.order - b.order) || [];
  
  // Group items by section
  const itemsBySection = sortedItems.reduce((acc, item) => {
    const sectionId = item.sectionId || 'unsorted';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(item);
    return acc;
  }, {} as Record<string, typeof sortedItems>);
  
  // Helper function to toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {currentPortfolio.items.length} items
            </div>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
            >
              Add Items
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={async () => {
          setIsUploadModalOpen(false);
          await refreshCurrentPortfolio();
        }}
      />

      {/* Sections and Items */}
      {sortedSections.length > 0 || itemsBySection.unsorted ? (
        <div className="space-y-4">
          {/* Render sections */}
          {sortedSections.map((section) => {
            const sectionItems = itemsBySection[section.id] || [];
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div key={section.id} className="bg-white rounded-lg shadow-sm border">
                {/* Section Header */}
                <div 
                  className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">
                        {isExpanded ? '📂' : '📁'}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-gray-600">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {sectionItems.length} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id, section.title);
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Delete section"
                      >
                        🗑️
                      </button>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Section Content */}
                {isExpanded && sectionItems.length > 0 && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sectionItems.map((item) => (
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
                                {item.thumbnailBase64 ? (
                                  <img
                                    src={`data:image/jpeg;base64,${item.thumbnailBase64}`}
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Unsorted Items */}
          {itemsBySection.unsorted && itemsBySection.unsorted.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div 
                className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('unsorted')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg">
                      {expandedSections.has('unsorted') ? '📂' : '📁'}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Unsorted</h3>
                      <p className="text-sm text-gray-600">Items not organized into sections</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {itemsBySection.unsorted.length} items
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.has('unsorted') ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {expandedSections.has('unsorted') && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {itemsBySection.unsorted.map((item) => (
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
                              {item.thumbnailBase64 ? (
                                <img
                                  src={`data:image/jpeg;base64,${item.thumbnailBase64}`}
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Yet</h3>
          <p className="text-gray-600 mb-4">
            Upload your first images or videos to start building your portfolio.
          </p>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            Add Your First Item
          </Button>
        </div>
      )}
    </div>
  );
}