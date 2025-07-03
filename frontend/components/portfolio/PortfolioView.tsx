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

  const handleDeleteSection = async (sectionId: string, sectionTitle: string) => {
    if (!currentPortfolio) return;
    
    if (confirm(`Are you sure you want to delete "${sectionTitle}"? Items in this section will be moved to Unsorted. This action cannot be undone.`)) {
      try {
        await api.deleteSection(currentPortfolio.id, sectionId);
        await refreshCurrentPortfolio();
      } catch (error) {
        console.error('Failed to delete section:', error);
        alert('Failed to delete section. Please try again.');
      }
    }
  };

  if (!currentPortfolio) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-gray-300 rounded border-dashed"></div>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">No Portfolio Selected</h2>
          <p className="text-gray-500">Create or select a portfolio to get started.</p>
        </div>
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
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-medium text-black mb-1">{currentPortfolio.title}</h1>
            {currentPortfolio.description && (
              <p className="text-gray-600">{currentPortfolio.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-6 ml-6">
            <div className="text-sm text-gray-400 font-mono">
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
              <div key={section.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                {/* Section Header */}
                <div 
                  className="p-5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-400 font-mono">
                        {sectionItems.length} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id, section.title);
                        }}
                        className="text-gray-300 hover:text-gray-500 transition-colors text-xs"
                        title="Delete section"
                      >
                        Delete
                      </button>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sectionItems.map((item) => (
                        <div key={item.id} className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
                          {/* Media Preview */}
                          <div className="aspect-video bg-gray-50 flex items-center justify-center">
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
                                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                      <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900 flex-1 text-sm">{item.title}</h4>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-gray-300 hover:text-gray-500 transition-colors text-xs ml-2 flex-shrink-0"
                                title="Delete item"
                              >
                                Delete
                              </button>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="truncate">{item.originalName}</span>
                              <span className="ml-2 flex-shrink-0">
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
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <div 
                className="p-5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('unsorted')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Unsorted</h3>
                      <p className="text-sm text-gray-500 mt-1">Items not organized into sections</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400 font-mono">
                      {itemsBySection.unsorted.length} items
                    </span>
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.has('unsorted') ? 'rotate-180' : ''}`}
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
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {itemsBySection.unsorted.map((item) => (
                      <div key={item.id} className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
                        {/* Media Preview */}
                        <div className="aspect-video bg-gray-50 flex items-center justify-center">
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
                                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                    <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900 flex-1 text-sm">{item.title}</h4>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-gray-300 hover:text-gray-500 transition-colors text-xs ml-2 flex-shrink-0"
                              title="Delete item"
                            >
                              Delete
                            </button>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="truncate">{item.originalName}</span>
                            <span className="ml-2 flex-shrink-0">
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
        <div className="bg-white border border-gray-100 rounded-lg p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-gray-300 rounded border-dashed"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Yet</h3>
          <p className="text-gray-500 mb-6">
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