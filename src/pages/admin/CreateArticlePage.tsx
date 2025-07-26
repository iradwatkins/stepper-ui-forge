import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Type
} from 'lucide-react';
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions';
import { useAdminMagazine, ContentBlock } from '@/hooks/useMagazine';
import DragDropContentEditor from '@/components/magazine/DragDropContentEditor';
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
import { Label } from '@/components/ui/label';
import SimpleImageUpload from '@/components/ui/SimpleImageUpload';

interface ContentBlockEditor extends ContentBlock {
  isEditing?: boolean;
}

const STORAGE_KEY = 'create-article-draft';

export default function CreateArticlePage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useIsAdmin();
  const { categories, createArticle, loading } = useAdminMagazine();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlockEditor[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Load saved draft from localStorage on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setTitle(parsed.title || '');
        setExcerpt(parsed.excerpt || '');
        setFeaturedImage(parsed.featuredImage || '');
        setCategoryId(parsed.categoryId || null);
        setContentBlocks(parsed.contentBlocks || []);
      } catch (error) {
        console.error('Failed to parse saved draft:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    const hasContent = title || excerpt || featuredImage || categoryId || contentBlocks.length > 0;
    if (hasContent) {
      const draftData = {
        title,
        excerpt,
        featuredImage,
        categoryId,
        contentBlocks
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    }
  }, [title, excerpt, featuredImage, categoryId, contentBlocks]);

  // Track changes
  useEffect(() => {
    const hasContent = title || excerpt || featuredImage || categoryId || contentBlocks.length > 0;
    setIsDirty(hasContent);
  }, [title, excerpt, featuredImage, categoryId, contentBlocks]);

  const addContentBlock = (type: string, position?: number) => {
    const insertPosition = position !== undefined ? position : contentBlocks.length;
    const newBlock: ContentBlockEditor = {
      id: Date.now(),
      type: type as ContentBlock['type'],
      content: type === 'divider' ? '---' : '',
      order: insertPosition,
      isEditing: type !== 'divider' // Don't auto-edit dividers
    };

    // Update existing blocks' order if inserting in middle
    const updatedBlocks = contentBlocks.map(block => ({
      ...block,
      order: block.order >= insertPosition ? block.order + 1 : block.order
    }));

    setContentBlocks([...updatedBlocks, newBlock]);
  };

  const updateContentBlock = useCallback((id: number, updates: Partial<ContentBlock>) => {
    setContentBlocks(blocks =>
      blocks.map(block =>
        block.id === id
          ? { ...block, ...updates }
          : block
      )
    );
  }, []);

  // Debounced content update to prevent rapid state changes
  const debouncedUpdateContent = useCallback((id: number, content: string) => {
    console.log(`[ContentBlock] Debounced update for block ${id}:`, content);
    updateContentBlock(id, { content });
  }, [updateContentBlock]);

  const deleteContentBlock = (id: number) => {
    setContentBlocks(blocks =>
      blocks.filter(block => block.id !== id)
        .map((block, index) => ({ ...block, order: index }))
    );
  };

  const moveBlock = (id: number, direction: 'up' | 'down') => {
    const currentIndex = contentBlocks.findIndex(block => block.id === id);
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

  const setBlockEditing = (id: number, editing: boolean) => {
    setContentBlocks(blocks =>
      blocks.map(block =>
        block.id === id
          ? { ...block, isEditing: editing }
          : block
      )
    );
  };

  const duplicateBlock = (block: ContentBlock) => {
    const newBlock = {
      ...block,
      id: Date.now(), // Generate new ID
      order: block.order + 1
    };
    
    setContentBlocks(blocks => {
      const newBlocks = [...blocks];
      const insertIndex = blocks.findIndex(b => b.id === block.id) + 1;
      newBlocks.splice(insertIndex, 0, newBlock);
      
      // Update order for blocks after insertion
      return newBlocks.map((b, index) => ({ ...b, order: index }));
    });
  };

  const handleSave = async (status: 'draft' | 'published') => {
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

    const result = await createArticle(articleData);
    if (result) {
      localStorage.removeItem(STORAGE_KEY);
      setIsDirty(false);
      navigate('/dashboard/admin/magazine');
    }
  };


  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
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
                const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your progress will be automatically saved.');
                if (!confirmed) return;
              }
              navigate('/dashboard/admin/magazine');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Magazine
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Article</h1>
            <p className="text-muted-foreground">Write and publish a new magazine article</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all draft data? This cannot be undone.')) {
                localStorage.removeItem(STORAGE_KEY);
                setTitle('');
                setExcerpt('');
                setFeaturedImage('');
                setCategoryId(null);
                setContentBlocks([]);
                setIsDirty(false);
                toast.success('Draft cleared');
              }
            }}
            disabled={!isDirty}
            className="text-destructive hover:text-destructive"
          >
            Clear Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={loading || !title.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={loading || !title.trim() || !categoryId}
          >
            <Eye className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Article Details */}
        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter article title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={!title.trim() && isDirty ? 'border-destructive' : ''}
                />
              </div>
              <div className="md:col-span-2">
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
                  type="featured"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={categoryId?.toString() || ''}
                  onValueChange={(value) => setCategoryId(value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        {/* Drag & Drop Content Editor */}
        <DragDropContentEditor
          contentBlocks={contentBlocks}
          onBlocksChange={setContentBlocks}
          onBlockUpdate={updateContentBlock}
          onBlockDelete={deleteContentBlock}
          onBlockDuplicate={duplicateBlock}
          onBlockToggleEdit={setBlockEditing}
        />
      </div>

      {/* Status Summary */}
      {isDirty && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm font-medium">Draft auto-saved - your progress is protected from page refreshes</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}