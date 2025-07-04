import { useState, useEffect } from 'react';

export interface Section {
  _id: string;
  id: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseFormSectionsProps {
  portfolioId: string;
  onError?: (error: string) => void;
}

export const useFormSections = ({ portfolioId, onError }: UseFormSectionsProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}/sections`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sections');
      }
      
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      onError?.('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const createSection = async (title: string, description?: string) => {
    try {
      setCreating(true);
      const response = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create section');
      }

      const newSection = await response.json();
      setSections(prev => [...prev, newSection]);
      
      return newSection;
    } catch (error) {
      console.error('Error creating section:', error);
      onError?.('Failed to create section');
      throw error;
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (portfolioId) {
      fetchSections();
    }
  }, [portfolioId]);

  return {
    sections,
    loading,
    creating,
    createSection,
    refetchSections: fetchSections,
  };
};