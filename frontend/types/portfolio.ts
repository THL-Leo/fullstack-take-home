export interface ItemMetadata {
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  format: string;
}

export interface PortfolioItem {
  id: string;
  type: 'image' | 'video';
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  title: string;
  description: string;
  metadata: ItemMetadata;
  sectionId?: string;  // New field for section assignment
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  title: string;
  description?: string;
  items: PortfolioItem[];  // Keep for backward compatibility
  sections: Section[];     // New sections array
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioCreate {
  title: string;
  description?: string;
}

export interface SectionCreate {
  title: string;
  description?: string;
  order: number;
}

export interface PortfolioItemCreate {
  type: 'image' | 'video';
  filename: string;
  originalName: string;
  title: string;
  description: string;
  sectionId?: string;  // New field for section assignment
  order: number;
}