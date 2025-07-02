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
  title: string;
  description: string;
  metadata: ItemMetadata;
  sectionId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  description?: string;
  isExpanded: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  title: string;
  description?: string;
  sections: Section[];
  items: PortfolioItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioCreate {
  title: string;
  description?: string;
}

export interface SectionCreate {
  name: string;
  description?: string;
  order: number;
}

export interface PortfolioItemCreate {
  type: 'image' | 'video';
  filename: string;
  originalName: string;
  title: string;
  description: string;
  sectionId: string;
  order: number;
}