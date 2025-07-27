import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Type, 
  Heading1, 
  Heading2,
  Upload,
  GripVertical,
  Loader2,
  Monitor
} from 'lucide-react';
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions';
import { useAdminMagazine, ContentBlock } from '@/hooks/useMagazine';
import { magazineService } from '@/services/magazineService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import SimpleImageUpload from '@/components/ui/SimpleImageUpload';
import ModernContentBlock from '@/components/magazine/ModernContentBlock';
import QuickInsertToolbar from '@/components/magazine/QuickInsertToolbar';
import ArticlePreview from '@/components/magazine/ArticlePreview';

interface ContentBlockEditor extends ContentBlock {
  isEditing?: boolean;
}

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useIsAdmin();
  const { categories, updateArticle, loading: updateLoading } = useAdminMagazine();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlockEditor[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published'>('draft');
  const [isDirty, setIsDirty] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // For now, use mock data to get the article (in real app, would have getArticleById method)
        const articles = await magazineService.getAdminArticles();
        const article = articles.articles.find(a => a.id === parseInt(id));
        
        if (!article) {
          setNotFound(true);
          return;
        }

        setTitle(article.title);
        setExcerpt(article.excerpt || '');
        setFeaturedImage(article.featuredImage || '');
        setCategoryId(article.category?.id || null);
        setCurrentStatus(article.status);
        setContentBlocks(article.contentBlocks?.map(block => ({ ...block, isEditing: false })) || []);
      } catch (error) {
        console.error('Failed to load article:', error);
        toast.error('Failed to load article');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id]);

  // Track changes
  useEffect(() => {
    setIsDirty(true);
  }, [title, excerpt, featuredImage, categoryId, contentBlocks]);

  const addContentBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlockEditor = {
      id: Date.now(),
      type,
      content: '',
      order: contentBlocks.length,
      isEditing: true
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const updateContentBlock = useCallback((blockId: number, updates: Partial<ContentBlock>) => {
    setContentBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, ...updates }
          : block
      )
    );
  }, []);

  const deleteContentBlock = (blockId: number) => {
    setContentBlocks(blocks =>
      blocks.filter(block => block.id !== blockId)
        .map((block, index) => ({ ...block, order: index }))
    );
  };

  const duplicateContentBlock = (block: ContentBlock) => {
    const newBlock: ContentBlockEditor = {
      ...block,
      id: Date.now(),
      order: contentBlocks.length,
      isEditing: false
    };
    setContentBlocks([...contentBlocks, newBlock]);
    toast.success('Block duplicated');
  };

  // Debounced content update to prevent rapid state changes
  const debouncedUpdateContent = useCallback((id: number, content: string) => {
    console.log(`[ContentBlock] Debounced update for block ${id}:`, content);
    updateContentBlock(id, { content });
  }, [updateContentBlock]);

  const moveBlock = (blockId: number, direction: 'up' | 'down') => {
    const currentIndex = contentBlocks.findIndex(block => block.id === blockId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= contentBlocks.length) return;

    const newBlocks = [...contentBlocks];
    [newBlocks[currentIndex], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[currentIndex]];
    
    // Update order
    newBlocks.forEach((block, index) => {
      block.order = index;
    });

    setContentBlocks(newBlocks);
  };

  const setBlockEditing = (blockId: number, editing: boolean) => {
    setContentBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, isEditing: editing }
          : block
      )
    );
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!id) return;
    
    if (!title.trim()) {
      toast.error('Article title is required');
      return;
    }

    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    const articleData = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      featuredImage: featuredImage.trim(),
      magazineCategoryId: categoryId,
      status,
      contentBlocks: contentBlocks.map(({ isEditing, ...block }) => block)
    };

    const result = await updateArticle(parseInt(id), articleData);
    if (result) {
      setIsDirty(false);
      setCurrentStatus(status);
      toast.success(`Article ${status === 'published' ? 'published' : 'updated'} successfully!`);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-4">The article you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/admin/magazine')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Magazine
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isDirty) {
                const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
                if (!confirmed) return;
              }
              navigate('/dashboard/admin/magazine');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Magazine
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Edit Article</h1>
              <Badge variant={currentStatus === 'published' ? 'default' : 'secondary'}>
                {currentStatus === 'published' ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Modify your magazine article</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            size="sm"
          >
            <Monitor className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={updateLoading || !title.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={updateLoading || !title.trim() || !categoryId}
          >
            <Eye className="w-4 h-4 mr-2" />
            {currentStatus === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Compact Publishing Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 mb-6 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Label htmlFor="header-category" className="text-sm font-medium">Category:</Label>
          <Select
            value={categoryId?.toString() || ''}
            onValueChange={(value) => setCategoryId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Separator orientation="vertical" className="h-5" />
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><strong>Blocks:</strong> {contentBlocks.length}</span>
          <span><strong>Read time:</strong> {Math.max(1, Math.ceil(contentBlocks.length * 1.5))} min</span>
          {title && <span><strong>Title:</strong> {title.length > 30 ? title.substring(0, 30) + '...' : title}</span>}
        </div>
        
        {isDirty && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400">
              Unsaved changes
            </Badge>
          </>
        )}
      </div>

      <div className={`grid gap-8 ${showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Main Content */}
        <div className="space-y-6">
          {/* Article Details */}
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter article title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={!title.trim() && isDirty ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Brief description of the article..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label>Featured Image</Label>
                <SimpleImageUpload
                  value={featuredImage}
                  onChange={(url) => setFeaturedImage(url || '')}
                  className="mt-2"
                  placeholder="Upload featured image for the article"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Blocks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Blocks</CardTitle>
                <QuickInsertToolbar onInsert={addContentBlock} />
              </div>
            </CardHeader>
            <CardContent>
              {contentBlocks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Type className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No content blocks yet. Click "Add Block" to start writing your article.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentBlocks
                    .sort((a, b) => a.order - b.order)
                    .map((block, index) => (
                      <ModernContentBlock
                        key={block.id}
                        block={block}
                        index={index}
                        total={contentBlocks.length}
                        onUpdate={updateContentBlock}
                        onDelete={deleteContentBlock}
                        onMove={(id, direction) => moveBlock(id, direction)}
                        onDuplicate={duplicateContentBlock}
                        onToggleEdit={setBlockEditing}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar & Preview */}
        {showPreview ? (
          <div className="h-[calc(100vh-12rem)] sticky top-8">
            <ArticlePreview
              title={title}
              excerpt={excerpt}
              featuredImage={featuredImage}
              category={categories.find(c => c.id === categoryId)?.name}
              contentBlocks={contentBlocks}
              viewMode={previewMode}
              onViewModeChange={setPreviewMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}