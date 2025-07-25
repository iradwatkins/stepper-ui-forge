import { MagazineCategory, MagazineArticle, ArticleListResponse } from '@/hooks/useMagazine';
import { supabase } from '@/integrations/supabase/client';

// Mock data for development (since backend might not be running)
const mockCategories: MagazineCategory[] = [
  {
    id: 1,
    name: 'Community Spotlight',
    slug: 'community-spotlight',
    description: 'Featuring amazing stories from our stepping community members and organizers',
    articleCount: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Event Coverage',
    slug: 'event-coverage', 
    description: 'In-depth coverage of stepping events, competitions, and performances',
    articleCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Dance Tutorials',
    slug: 'dance-tutorials',
    description: 'Step-by-step tutorials and technique breakdowns from experienced steppers',
    articleCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Stepping Culture',
    slug: 'stepping-culture',
    description: 'Exploring the rich history and culture of stepping traditions',
    articleCount: 4,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockArticles: MagazineArticle[] = [
  {
    id: 1,
    title: 'The Evolution of Greek Stepping: From Tradition to Innovation',
    slug: 'evolution-greek-stepping-tradition-innovation',
    excerpt: 'Explore how Greek stepping has evolved while maintaining its cultural roots and significance in modern times.',
    featuredImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=400&fit=crop',
    authorId: 1,
    authorName: 'Maria Jackson',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
    status: 'published',
    createdAt: '2024-12-10T10:00:00Z',
    updatedAt: '2024-12-10T10:00:00Z',
    readTimeMinutes: 8,
    viewCount: 425,
    category: mockCategories[3], // Stepping Culture
    contentBlocks: [
      {
        id: 1,
        type: 'paragraph',
        content: '<p>Greek stepping has been a cornerstone of African American Greek-letter organizations for over a century, evolving from simple rhythmic movements to complex choreographed performances that captivate audiences worldwide.</p>',
        order: 1
      },
      {
        id: 2,
        type: 'header',
        content: 'Historical Roots and Origins',
        order: 2
      },
      {
        id: 3,
        type: 'paragraph',
        content: '<p>The tradition of stepping can be traced back to the early 1900s when the first African American Greek-letter organizations were founded. These groups used rhythmic stepping as a form of expression, unity, and cultural identity.</p>',
        order: 3
      }
    ]
  },
  {
    id: 2,
    title: 'Mastering the Basic Step: A Beginner\'s Guide to Stepping Fundamentals',
    slug: 'mastering-basic-step-beginners-guide-stepping-fundamentals',
    excerpt: 'Start your stepping journey with this comprehensive guide covering essential techniques and foundational moves.',
    featuredImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop',
    authorId: 2,
    authorName: 'Coach Williams',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=coach',
    status: 'published',
    createdAt: '2024-12-08T14:00:00Z',
    updatedAt: '2024-12-08T14:00:00Z',
    readTimeMinutes: 12,
    viewCount: 678,
    category: mockCategories[2], // Dance Tutorials
    contentBlocks: [
      {
        id: 4,
        type: 'paragraph',
        content: '<p>Whether you\'re new to stepping or looking to refine your basics, mastering fundamental techniques is crucial for building a strong foundation in this dynamic art form.</p>',
        order: 1
      },
      {
        id: 5,
        type: 'header',
        content: 'Essential Stepping Stance',
        order: 2
      },
      {
        id: 6,
        type: 'paragraph',
        content: '<p>The foundation of all stepping begins with proper posture. Keep your shoulders back, core engaged, and weight evenly distributed on both feet. This stance provides the stability needed for complex movements.</p>',
        order: 3
      }
    ]
  },
  {
    id: 3,
    title: 'National Step Championship 2024: Highlights and Standout Performances',
    slug: 'national-step-championship-2024-highlights-standout-performances',
    excerpt: 'Recap of the most exciting moments and exceptional performances from this year\'s National Step Championship.',
    featuredImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&h=400&fit=crop',
    authorId: 3,
    authorName: 'Event Reporter',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reporter',
    status: 'published',
    createdAt: '2024-12-05T16:00:00Z',
    updatedAt: '2024-12-05T16:00:00Z',
    readTimeMinutes: 6,
    viewCount: 892,
    category: mockCategories[1], // Event Coverage
    contentBlocks: [
      {
        id: 7,
        type: 'paragraph',
        content: '<p>The 2024 National Step Championship brought together the best stepping teams from across the country for an unforgettable weekend of competition, creativity, and community celebration.</p>',
        order: 1
      },
      {
        id: 8,
        type: 'subheader',
        content: 'Championship Highlights',
        order: 2
      },
      {
        id: 9,
        type: 'paragraph',
        content: '<p>This year\'s competition featured groundbreaking performances that pushed the boundaries of traditional stepping while honoring its rich cultural heritage.</p>',
        order: 3
      }
    ]
  }
];

class MagazineService {
  private async withFallback<T>(
    supabaseOperation: () => Promise<T>,
    mockData: T,
    operationName: string
  ): Promise<T> {
    try {
      return await supabaseOperation();
    } catch (error: any) {
      console.error(`${operationName} failed:`, error);
      
      // Check if this is a table not found error
      if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
        console.error('Magazine tables not found in database. Please run migrations.');
        throw new Error('Magazine system not initialized. Please contact administrator.');
      }
      
      // In production, don't fall back to mock data - throw the error
      if (import.meta.env.PROD) {
        throw error;
      }
      
      console.warn(`Using mock data in development mode`);
      return mockData;
    }
  }

  // Public API methods
  async getCategories(): Promise<MagazineCategory[]> {
    return this.withFallback(
      async () => {
        const { data, error } = await supabase
          .from('magazine_categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        // Transform database format to interface format
        return data.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          articleCount: 0, // Will be calculated separately if needed
          createdAt: cat.created_at,
          updatedAt: cat.updated_at
        }));
      },
      mockCategories,
      'getCategories'
    );
  }

  async getArticles(filters: Record<string, unknown> = {}): Promise<ArticleListResponse> {
    return this.withFallback(
      async () => {
        let query = supabase
          .from('magazine_articles')
          .select(`
            *,
            category:magazine_categories(*)
          `)
          .eq('status', 'published');

        // Apply filters
        if (filters.categorySlug) {
          query = query.eq('category.slug', filters.categorySlug);
        }

        if (filters.search) {
          const searchTerm = `%${filters.search}%`;
          query = query.or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`);
        }

        // Add pagination
        const page = (filters.page as number) || 1;
        const limit = (filters.limit as number) || 10;
        const offset = (page - 1) * limit;
        
        query = query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Transform to interface format
        const articles = data?.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featured_image,
          authorId: article.author_id,
          authorName: 'Author', // TODO: Join with profiles table
          authorAvatar: undefined,
          status: article.status as 'draft' | 'published',
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          readTimeMinutes: article.read_time_minutes,
          viewCount: article.view_count,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
            description: article.category.description,
            createdAt: article.category.created_at,
            updatedAt: article.category.updated_at
          } : undefined,
          contentBlocks: Array.isArray(article.content_blocks) 
            ? article.content_blocks 
            : []
        })) || [];

        return {
          articles: filters.featured ? articles.slice(0, 2) : articles,
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        };
      },
      {
        articles: filters.featured ? mockArticles.slice(0, 2) : mockArticles,
        total: mockArticles.length,
        page: (filters.page as number) || 1,
        limit: (filters.limit as number) || 10,
        totalPages: Math.ceil(mockArticles.length / ((filters.limit as number) || 10))
      },
      'getArticles'
    );
  }

  async getArticlesByCategory(categorySlug: string, page = 1, limit = 10): Promise<ArticleListResponse> {
    return this.getArticles({ categorySlug, page, limit });
  }

  async getArticleBySlug(slug: string): Promise<MagazineArticle | null> {
    return this.withFallback(
      async () => {
        // First get the article
        const { data: article, error } = await supabase
          .from('magazine_articles')
          .select(`
            *,
            category:magazine_categories(*)
          `)
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (error) throw error;
        if (!article) return null;

        // Increment view count
        await supabase
          .from('magazine_articles')
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq('id', article.id);

        // Transform to interface format
        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featured_image,
          authorId: article.author_id,
          authorName: 'Author', // TODO: Join with profiles table
          authorAvatar: undefined,
          status: article.status as 'draft' | 'published',
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          readTimeMinutes: article.read_time_minutes,
          viewCount: (article.view_count || 0) + 1,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
            description: article.category.description,
            createdAt: article.category.created_at,
            updatedAt: article.category.updated_at
          } : undefined,
          contentBlocks: Array.isArray(article.content_blocks) 
            ? article.content_blocks 
            : []
        };
      },
      mockArticles.find(article => article.slug === slug) || null,
      'getArticleBySlug'
    );
  }

  // Admin API methods
  async getAdminArticles(filters: Record<string, unknown> = {}): Promise<ArticleListResponse> {
    return this.withFallback(
      async () => {
        let query = supabase
          .from('magazine_articles')
          .select(`
            *,
            category:magazine_categories(*)
          `);

        // Apply admin filters (including drafts)
        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }

        if (filters.search) {
          const searchTerm = `%${filters.search}%`;
          query = query.ilike('title', searchTerm);
        }

        // Add pagination
        const page = (filters.page as number) || 1;
        const limit = (filters.limit as number) || 10;
        const offset = (page - 1) * limit;
        
        query = query
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Transform to interface format
        const articles = data?.map(article => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featured_image,
          authorId: article.author_id,
          authorName: 'Author', // TODO: Join with profiles table
          authorAvatar: undefined,
          status: article.status as 'draft' | 'published',
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          readTimeMinutes: article.read_time_minutes,
          viewCount: article.view_count,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
            description: article.category.description,
            createdAt: article.category.created_at,
            updatedAt: article.category.updated_at
          } : undefined,
          contentBlocks: Array.isArray(article.content_blocks) 
            ? article.content_blocks 
            : []
        })) || [];

        return {
          articles,
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        };
      },
      {
        articles: mockArticles,
        total: mockArticles.length,
        page: (filters.page as number) || 1,
        limit: (filters.limit as number) || 10,
        totalPages: Math.ceil(mockArticles.length / ((filters.limit as number) || 10))
      },
      'getAdminArticles'
    );
  }

  async createCategory(data: { name: string; description?: string }): Promise<MagazineCategory> {
    return this.withFallback(
      async () => {
        // Generate slug from name
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const { data: category, error } = await supabase
          .from('magazine_categories')
          .insert({
            name: data.name,
            slug: slug,
            description: data.description || `Explore our collection of ${data.name.toLowerCase()} articles`
          })
          .select()
          .single();

        if (error) {
          console.error('Create category error:', error);
          if (error.code === '42501') {
            throw new Error('You do not have permission to create categories. Please ensure you are logged in as an admin.');
          }
          if (error.code === '23505') {
            throw new Error('A category with this name already exists.');
          }
          throw error;
        }

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          articleCount: 0,
          createdAt: category.created_at,
          updatedAt: category.updated_at
        };
      },
      {
        id: Math.max(...mockCategories.map(c => c.id)) + 1,
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: data.description || `Explore our collection of ${data.name.toLowerCase()} articles`,
        articleCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      'createCategory'
    );
  }

  async updateCategory(id: number, data: { name?: string; description?: string }): Promise<MagazineCategory> {
    return this.withFallback(
      async () => {
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;

        const { data: category, error } = await supabase
          .from('magazine_categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          articleCount: 0,
          createdAt: category.created_at,
          updatedAt: category.updated_at
        };
      },
      (() => {
        const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
        if (categoryIndex === -1) {
          throw new Error('Category not found');
        }
        
        const updatedCategory = {
          ...mockCategories[categoryIndex],
          ...data,
          updatedAt: new Date().toISOString()
        };
        
        if (data.name) {
          updatedCategory.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        
        mockCategories[categoryIndex] = updatedCategory;
        return updatedCategory;
      })(),
      'updateCategory'
    );
  }

  async deleteCategory(id: number): Promise<void> {
    return this.withFallback(
      async () => {
        // First check if category has articles
        const { data: articles, error: articlesError } = await supabase
          .from('magazine_articles')
          .select('id')
          .eq('category_id', id)
          .limit(1);

        if (articlesError) {
          console.error('Error checking articles:', articlesError);
          if (articlesError.code === '42501') {
            throw new Error('You do not have permission to delete categories. Please ensure you are logged in as an admin.');
          }
          throw articlesError;
        }

        if (articles && articles.length > 0) {
          throw new Error('Cannot delete this category because it contains articles. Please move or delete the articles first.');
        }

        // Delete the category
        const { error } = await supabase
          .from('magazine_categories')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete category error:', error);
          if (error.code === '42501') {
            throw new Error('You do not have permission to delete categories. Please ensure you are logged in as an admin.');
          }
          throw error;
        }
      },
      async () => {
        const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
        if (categoryIndex === -1) {
          throw new Error('Category not found');
        }
        
        // Check if category has articles
        const hasArticles = mockArticles.some(article => article.category?.id === id);
        if (hasArticles) {
          throw new Error('Cannot delete this category because it contains articles. Please move or delete the articles first.');
        }
        
        mockCategories.splice(categoryIndex, 1);
      },
      'deleteCategory'
    );
  }

  async createArticle(data: Record<string, unknown>): Promise<MagazineArticle> {
    return this.withFallback(
      async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: article, error } = await supabase
          .from('magazine_articles')
          .insert({
            title: data.title as string,
            excerpt: data.excerpt as string,
            featured_image: data.featuredImage as string,
            author_id: user.id,
            category_id: data.magazineCategoryId as number,
            status: data.status as string,
            content_blocks: data.contentBlocks || []
          })
          .select(`
            *,
            category:magazine_categories(*)
          `)
          .single();

        if (error) throw error;

        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featured_image,
          authorId: article.author_id,
          authorName: 'Current Admin',
          authorAvatar: undefined,
          status: article.status as 'draft' | 'published',
          createdAt: article.created_at,
          updatedAt: article.updated_at,
          readTimeMinutes: article.read_time_minutes,
          viewCount: article.view_count,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
            description: article.category.description,
            createdAt: article.category.created_at,
            updatedAt: article.category.updated_at
          } : undefined,
          contentBlocks: Array.isArray(article.content_blocks) 
            ? article.content_blocks 
            : []
        };
      },
      // Mock fallback
      (() => {
        const category = mockCategories.find(cat => cat.id === data.magazineCategoryId);
        const newArticle: MagazineArticle = {
          id: Math.max(...mockArticles.map(a => a.id)) + 1,
          title: data.title as string,
          slug: (data.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          excerpt: data.excerpt as string,
          featuredImage: data.featuredImage as string,
          authorId: 1,
          authorName: 'Current Admin',
          authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          status: data.status as 'draft' | 'published',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          readTimeMinutes: Math.max(1, Math.floor(((data.contentBlocks as unknown[]) || []).length * 2)),
          viewCount: 0,
          category: category,
          contentBlocks: ((data.contentBlocks as unknown[]) || []).map((block: Record<string, unknown>, index: number) => ({
            id: Date.now() + index,
            type: block.type as string,
            content: block.content as string,
            order: block.order as number
          }))
        };
        mockArticles.unshift(newArticle);
        return newArticle;
      })(),
      'createArticle'
    );
  }

  async updateArticle(id: number, data: Record<string, unknown>): Promise<MagazineArticle> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    const articleIndex = mockArticles.findIndex(article => article.id === id);
    if (articleIndex === -1) {
      throw new Error('Article not found');
    }
    
    const category = data.magazineCategoryId ? 
      mockCategories.find(cat => cat.id === data.magazineCategoryId) : 
      mockArticles[articleIndex].category;
    
    const updatedArticle = {
      ...mockArticles[articleIndex],
      ...data,
      category: category,
      updatedAt: new Date().toISOString()
    };
    
    if (data.title) {
      updatedArticle.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    
    if (data.contentBlocks) {
      updatedArticle.contentBlocks = (data.contentBlocks as unknown[]).map((block: Record<string, unknown>, index: number) => ({
        id: block.id || Date.now() + index,
        type: block.type,
        content: block.content,
        order: block.order
      }));
    }
    
    mockArticles[articleIndex] = updatedArticle;
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
    
    const articleIndex = mockArticles.findIndex(article => article.id === id);
    if (articleIndex === -1) {
      throw new Error('Article not found');
    }
    
    mockArticles.splice(articleIndex, 1);
  }
}

export const magazineService = new MagazineService();