'use client';

import { PortfolioItem } from '@/types/portfolio';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ItemCardProps {
  item: PortfolioItem;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  return (
    <div 
      className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors cursor-pointer"
      onClick={() => onEdit(item)}
    >
      {/* Media Preview */}
      <div className="aspect-video bg-gray-50 flex items-center justify-center">
        {item.type === 'image' ? (
          <img
            src={item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`}
            alt={item.title}
            className="w-full h-full object-cover pointer-events-none"
            onError={(e) => {
              const fallbackSrc = `${API_BASE_URL}/uploads/${item.filename}`;
              e.currentTarget.src = fallbackSrc;
            }}
          />
        ) : (
          <div className="relative w-full h-full">
            {item.thumbnailBase64 ? (
              <img
                src={`data:image/jpeg;base64,${item.thumbnailBase64}`}
                alt={`${item.title} thumbnail`}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="text-center flex items-center justify-center h-full">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-400 rounded-sm"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900 flex-1 text-sm leading-tight pr-2">{item.title}</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-gray-300 hover:text-gray-500 transition-colors text-xs flex-shrink-0"
            title="Delete item"
          >
            <span className="hidden sm:inline">Delete</span>
            <span className="sm:hidden">×</span>
          </button>
        </div>
        {item.description && (
          <p className="text-xs md:text-sm text-gray-500 mb-2 md:mb-3 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="truncate flex-1 pr-2">{item.originalName}</span>
          {item.metadata.dimensions && (
            <span className="flex-shrink-0">
              {item.metadata.dimensions.width}×{item.metadata.dimensions.height}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}