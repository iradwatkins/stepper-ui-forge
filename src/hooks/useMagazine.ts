import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { magazineService } from '@/services/magazineService';

export interface MagazineCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MagazineArticle {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  readTimeMinutes?: number;
  viewCount?: number;
  category?: MagazineCategory;
  contentBlocks?: ContentBlock[];
}

export interface ContentBlock {
  id: number;
  type: 'header' | 'subheader' | 'paragraph' | 'image' | 'youtube_video' | 'embedded_video' | 'ad_placement';
  content: string;
  order: number;
  // Video timing options
  startTime?: number; // in seconds
  endTime?: number; // in seconds
}

export interface ArticleListResponse {
  articles: MagazineArticle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Hook for public magazine functionality
export const useMagazine = () => {
  const [categories, setCategories] = useState<MagazineCategory[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<MagazineArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await magazineService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchFeaturedArticles = useCallback(async () => {
    try {
      const response = await magazineService.getArticles({ featured: true, limit: 3 });
      setFeaturedArticles(response.articles);
    } catch (err) {
      console.error('Error fetching featured articles:', err);
    }
  }, []);

  const getArticlesByCategory = async (categorySlug: string, page = 1, limit = 10): Promise<ArticleListResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await magazineService.getArticlesByCategory(categorySlug, page, limit);
      return response;
    } catch (err) {
      const errorMessage = 'Failed to fetch articles';
      setError(errorMessage);
      console.error('Error fetching articles by category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getArticleBySlug = async (slug: string): Promise<MagazineArticle | null> => {
    try {
      setLoading(true);
      setError(null);
      const article = await magazineService.getArticleBySlug(slug);
      return article;
    } catch (err) {
      const errorMessage = 'Failed to fetch article';
      setError(errorMessage);
      console.error('Error fetching article by slug:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount - only once
  useEffect(() => {
    if (!initialized) {
      const initializeData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            fetchCategories(),
            fetchFeaturedArticles()
          ]);
        } catch (err) {
          setError('Failed to load magazine data');
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      };
      initializeData();
    }
  }, [initialized, fetchCategories, fetchFeaturedArticles]);

  return {
    categories,
    featuredArticles,
    loading,
    error,
    getArticlesByCategory,
    getArticleBySlug,
    fetchCategories,
    fetchFeaturedArticles
  };
};

// Hook for admin magazine management
export const useAdminMagazine = () => {
  const [categories, setCategories] = useState<MagazineCategory[]>([]);
  const [articles, setArticles] = useState<MagazineArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cats = await magazineService.getCategories();
      setCategories(cats);
    } catch (err) {
      setError('Failed to fetch categories');
      toast.error('Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = async (name: string, description?: string): Promise<MagazineCategory | null> => {
    try {
      setLoading(true);
      setError(null);
      const newCategory = await magazineService.createCategory({ name, description });
      
      // Update local state
      setCategories(prev => [...prev, newCategory]);
      
      toast.success('Category created successfully!');
      return newCategory;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create category';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error creating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (id: number, data: { name?: string; description?: string }): Promise<MagazineCategory | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedCategory = await magazineService.updateCategory(id, data);
      
      // Update local state
      setCategories(prev => prev.map(cat => 
        cat.id === id ? updatedCategory : cat
      ));
      
      toast.success('Category updated successfully!');
      return updatedCategory;
    } catch (err) {
      setError('Failed to update category');
      toast.error('Failed to update category');
      console.error('Error updating category:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await magazineService.deleteCategory(id);
      
      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== id));
      
      toast.success('Category deleted successfully!');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete category';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error deleting category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchAllArticles = useCallback(async (filters: Record<string, string> = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await magazineService.getAdminArticles(filters);
      setArticles(response.articles);
    } catch (err) {
      setError('Failed to fetch articles');
      toast.error('Failed to fetch articles');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createArticle = async (data: Record<string, unknown>): Promise<MagazineArticle | null> => {
    try {
      setLoading(true);
      setError(null);
      const newArticle = await magazineService.createArticle(data);
      
      // Update local state
      setArticles(prev => [newArticle, ...prev]);
      
      toast.success(`Article ${data.status === 'published' ? 'published' : 'saved as draft'} successfully!`);
      return newArticle;
    } catch (err) {
      setError('Failed to create article');
      toast.error('Failed to create article');
      console.error('Error creating article:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateArticle = async (id: number, data: Record<string, unknown>): Promise<MagazineArticle | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedArticle = await magazineService.updateArticle(id, data);
      
      // Update local state
      setArticles(prev => prev.map(article => 
        article.id === id ? updatedArticle : article
      ));
      
      toast.success('Article updated successfully!');
      return updatedArticle;
    } catch (err) {
      setError('Failed to update article');
      toast.error('Failed to update article');
      console.error('Error updating article:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await magazineService.deleteArticle(id);
      
      // Update local state
      setArticles(prev => prev.filter(article => article.id !== id));
      
      toast.success('Article deleted successfully!');
      return true;
    } catch (err) {
      setError('Failed to delete article');
      toast.error('Failed to delete article');
      console.error('Error deleting article:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchAllCategories();
    fetchAllArticles();
  }, [fetchAllCategories, fetchAllArticles]);

  return {
    categories,
    articles,
    loading,
    error,
    fetchAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchAllArticles,
    createArticle,
    updateArticle,
    deleteArticle
  };
};