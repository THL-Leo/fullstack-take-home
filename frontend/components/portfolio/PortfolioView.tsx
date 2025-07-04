'use client';

import { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import UploadModal from './UploadModal';
import EditItemModal from './EditItemModal';
import ItemCard from './ItemCard';
import Button from '@/components/ui/Button';
import { PortfolioItem } from '@/types/portfolio';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PortfolioView() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { currentPortfolio, deleteItem, refreshCurrentPortfolio } = usePortfolioStore();


  const handleEditItem = (item: PortfolioItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentPortfolio) return;
    
    
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
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white border border-gray-100 rounded-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-medium text-black mb-1">{currentPortfolio.title}</h1>
            {currentPortfolio.description && (
              <p className="text-gray-600 text-sm md:text-base">{currentPortfolio.description}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 sm:ml-6">
            <div className="text-xs md:text-sm text-gray-400 font-mono order-2 sm:order-1">
              {currentPortfolio.items.length} items
            </div>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
              className="order-1 sm:order-2"
            >
              <span className="hidden sm:inline">Add Items</span>
              <span className="sm:hidden">Add</span>
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

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={async (targetSectionId) => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
          await refreshCurrentPortfolio();
          
          // Auto-expand the target section if provided
          if (targetSectionId) {
            setExpandedSections(prev => new Set([...prev, targetSectionId]));
          }
        }}
      />

      {/* Sections and Items */}
      {sortedSections.length > 0 || itemsBySection.unsorted ? (
        <div className="space-y-3 md:space-y-4">
          {/* Render sections */}
          {sortedSections.map((section) => {
            const sectionItems = itemsBySection[section.id] || [];
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div key={section.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                {/* Section Header */}
                <div 
                  className="p-4 md:p-5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                      <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">{section.title}</h3>
                        {section.description && (
                          <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 flex-shrink-0">
                      <span className="text-xs md:text-sm text-gray-400 font-mono">
                        {sectionItems.length} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id, section.title);
                        }}
                        className="text-gray-300 hover:text-gray-500 transition-colors text-xs px-1.5 sm:px-2 py-1.5 min-h-[32px] flex items-center"
                        title="Delete section"
                      >
                        <span className="hidden sm:inline">Delete</span>
                        <span className="sm:hidden">×</span>
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
                  <div className="p-4 md:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                      {sectionItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                        />
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
                className="p-4 md:p-5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('unsorted')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                    <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <h3 className="text-base md:text-lg font-medium text-gray-900">Unsorted</h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">Items not organized into sections</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 flex-shrink-0">
                    <span className="text-xs md:text-sm text-gray-400 font-mono">
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
                <div className="p-4 md:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {itemsBySection.unsorted.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg p-8 md:p-16 text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-gray-300 rounded border-dashed"></div>
          </div>
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Items Yet</h3>
          <p className="text-gray-500 mb-4 md:mb-6 text-sm md:text-base">
            Upload your first images or videos to start building your portfolio.
          </p>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <span className="hidden sm:inline">Add Your First Item</span>
            <span className="sm:hidden">Add Item</span>
          </Button>
        </div>
      )}
    </div>
  );
}