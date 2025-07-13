import { MagazineCategory, MagazineArticle, ArticleListResponse } from '@/hooks/useMagazine';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('API request failed, using mock data:', error);
      // Return mock data when API is not available
      return this.getMockResponse(endpoint);
    }
  }

  private getMockResponse(endpoint: string): unknown {
    // Return appropriate mock data based on endpoint
    if (endpoint.includes('/categories')) {
      return mockCategories;
    }
    if (endpoint.includes('/articles')) {
      return {
        articles: mockArticles,
        total: mockArticles.length,
        page: 1,
        limit: 10,
        totalPages: 1
      };
    }
    return null;
  }

  // Public API methods
  async getCategories(): Promise<MagazineCategory[]> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    return mockCategories;
  }

  async getArticles(filters: Record<string, unknown> = {}): Promise<ArticleListResponse> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    let filteredArticles = [...mockArticles];
    
    // Apply filters
    if (filters.featured) {
      // For featured articles, return a subset
      filteredArticles = mockArticles.slice(0, 2);
    }
    
    if (filters.categorySlug) {
      const category = mockCategories.find(cat => cat.slug === filters.categorySlug);
      if (category) {
        filteredArticles = filteredArticles.filter(article => 
          article.category?.id === category.id
        );
      }
    }
    
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(query))
      );
    }
    
    // Sort by creation date (newest first)
    filteredArticles.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return {
      articles: filteredArticles,
      total: filteredArticles.length,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: Math.ceil(filteredArticles.length / (filters.limit || 10))
    };
  }

  async getArticlesByCategory(categorySlug: string, page = 1, limit = 10): Promise<ArticleListResponse> {
    return this.getArticles({ categorySlug, page, limit });
  }

  async getArticleBySlug(slug: string): Promise<MagazineArticle | null> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
    
    const article = mockArticles.find(article => article.slug === slug);
    if (article && article.id) {
      // Increment view count (in real app, this would be server-side)
      article.viewCount = (article.viewCount || 0) + 1;
    }
    return article || null;
  }

  // Admin API methods
  async getAdminArticles(filters: Record<string, unknown> = {}): Promise<ArticleListResponse> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    let filteredArticles = [...mockArticles];
    
    // Apply admin filters (including drafts)
    if (filters.status) {
      filteredArticles = filteredArticles.filter(article => article.status === filters.status);
    }
    
    if (filters.categoryId) {
      filteredArticles = filteredArticles.filter(article => 
        article.category?.id === filters.categoryId
      );
    }
    
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(query)
      );
    }
    
    // Sort by updated date (newest first)
    filteredArticles.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    return {
      articles: filteredArticles,
      total: filteredArticles.length,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: Math.ceil(filteredArticles.length / (filters.limit || 10))
    };
  }

  async createCategory(data: { name: string }): Promise<MagazineCategory> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    const newCategory: MagazineCategory = {
      id: Math.max(...mockCategories.map(c => c.id)) + 1,
      name: data.name,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: `Explore our collection of ${data.name.toLowerCase()} articles`,
      articleCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockCategories.push(newCategory);
    return newCategory;
  }

  async updateCategory(id: number, data: { name?: string }): Promise<MagazineCategory> {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
    
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
  }

  async deleteCategory(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay
    
    const categoryIndex = mockCategories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }
    
    // Check if category has articles
    const hasArticles = mockArticles.some(article => article.category?.id === id);
    if (hasArticles) {
      throw new Error('Cannot delete category that contains articles');
    }
    
    mockCategories.splice(categoryIndex, 1);
  }

  async createArticle(data: Record<string, unknown>): Promise<MagazineArticle> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    const category = mockCategories.find(cat => cat.id === data.magazineCategoryId);
    
    const newArticle: MagazineArticle = {
      id: Math.max(...mockArticles.map(a => a.id)) + 1,
      title: data.title,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      excerpt: data.excerpt,
      featuredImage: data.featuredImage,
      authorId: 1, // Current admin user
      authorName: 'Current Admin',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      status: data.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTimeMinutes: Math.max(1, Math.floor((data.contentBlocks || []).length * 2)),
      viewCount: 0,
      category: category,
      contentBlocks: (data.contentBlocks as unknown[] || []).map((block: Record<string, unknown>, index: number) => ({
        id: Date.now() + index,
        type: block.type,
        content: block.content,
        order: block.order
      }))
    };
    
    mockArticles.unshift(newArticle);
    return newArticle;
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