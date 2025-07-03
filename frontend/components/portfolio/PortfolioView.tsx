'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { api } from '@/lib/api';
import FileUpload from './FileUpload';
import Button from '@/components/ui/Button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PortfolioView() {
  const [isUploading, setIsUploading] = useState(false);
  const { currentPortfolio, deleteItem } = usePortfolioStore();

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
              onClick={() => setIsUploading(!isUploading)}
              size="sm"
            >
              {isUploading ? 'Cancel Upload' : 'Add Items'}
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Component */}
      {isUploading && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload New Items</h3>
          <FileUpload
            onSuccess={() => setIsUploading(false)}
          />
        </div>
      )}

      {/* Items Grid */}
      {sortedItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedItems.map((item) => {
              console.log('Rendering item:', { id: item.id, title: item.title, type: item.type });
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
              );
            })}
          </div>
        </div>
      ) : !isUploading ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Yet</h3>
          <p className="text-gray-600 mb-4">
            Upload your first images or videos to start building your portfolio.
          </p>
          <Button onClick={() => setIsUploading(true)}>
            Add Your First Item
          </Button>
        </div>
      ) : null}
    </div>
  );
}