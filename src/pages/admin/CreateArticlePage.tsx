import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  GripVertical
} from 'lucide-react';
import { useIsAdmin } from '@/lib/hooks/useAdminPermissions';
import { useAdminMagazine, ContentBlock } from '@/hooks/useMagazine';
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

interface ContentBlockEditor extends ContentBlock {
  isEditing?: boolean;
}

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

  // Track changes
  useEffect(() => {
    const hasContent = title || excerpt || featuredImage || categoryId || contentBlocks.length > 0;
    setIsDirty(hasContent);
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
            <h1 className="text-3xl font-bold">Create Article</h1>
            <p className="text-muted-foreground">Write and publish a new magazine article</p>
          </div>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Block
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Content Block</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('header')}
                      >
                        <Heading1 className="w-6 h-6" />
                        Header
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('subheader')}
                      >
                        <Heading2 className="w-6 h-6" />
                        Subheader
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('paragraph')}
                      >
                        <Type className="w-6 h-6" />
                        Paragraph
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('image')}
                      >
                        <ImageIcon className="w-6 h-6" />
                        Image
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('youtube_video')}
                      >
                        <Video className="w-6 h-6" />
                        YouTube
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2"
                        onClick={() => addContentBlock('embedded_video')}
                      >
                        <Upload className="w-6 h-6" />
                        Video
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                    .map((block) => (
                      <ContentBlockComponent key={block.id} block={block} />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Draft:</strong> Save your work without publishing
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Publish:</strong> Make article visible to readers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Article Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Article Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <strong>Title:</strong> {title || 'Untitled Article'}
                </div>
                <div className="text-sm">
                  <strong>Content Blocks:</strong> {contentBlocks.length}
                </div>
                <div className="text-sm">
                  <strong>Estimated Read Time:</strong> {Math.max(1, Math.ceil(contentBlocks.length * 1.5))} min
                </div>
                {categoryId && (
                  <div className="text-sm">
                    <strong>Category:</strong> {categories.find(c => c.id === categoryId)?.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}