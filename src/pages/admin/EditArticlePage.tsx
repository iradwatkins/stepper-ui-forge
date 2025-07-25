import { useState, useEffect } from 'react';
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
  Loader2
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

  const updateContentBlock = (blockId: number, updates: Partial<ContentBlock>) => {
    setContentBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, ...updates, isEditing: false }
          : block
      )
    );
  };

  const deleteContentBlock = (blockId: number) => {
    setContentBlocks(blocks =>
      blocks.filter(block => block.id !== blockId)
        .map((block, index) => ({ ...block, order: index }))
    );
  };

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

  const ContentBlockComponent = ({ block }: { block: ContentBlockEditor }) => {
    if (block.isEditing) {
      return (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {block.type === 'header' && 'Header'}
                {block.type === 'subheader' && 'Subheader'}
                {block.type === 'paragraph' && 'Paragraph'}
                {block.type === 'image' && 'Image'}
                {block.type === 'youtube_video' && 'YouTube Video'}
                {block.type === 'embedded_video' && 'Embedded Video'}
              </Badge>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setBlockEditing(block.id, false)}
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteContentBlock(block.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(block.type === 'header' || block.type === 'subheader') && (
              <Input
                placeholder="Enter heading text..."
                value={block.content}
                onChange={(e) => updateContentBlock(block.id, { content: e.target.value })}
                autoFocus
              />
            )}
            {block.type === 'paragraph' && (
              <Textarea
                placeholder="Enter paragraph content..."
                value={block.content}
                onChange={(e) => updateContentBlock(block.id, { content: e.target.value })}
                rows={4}
                autoFocus
              />
            )}
            {block.type === 'image' && (
              <div className="space-y-3">
                <SimpleImageUpload
                  value={block.content}
                  onChange={(url) => updateContentBlock(block.id, { content: url || '' })}
                  placeholder="Upload, paste, or drop an image here"
                />
              </div>
            )}
            {(block.type === 'youtube_video' || block.type === 'embedded_video') && (
              <div className="space-y-3">
                <Input
                  placeholder="Enter video URL or embed code..."
                  value={block.content}
                  onChange={(e) => updateContentBlock(block.id, { content: e.target.value })}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={block.startTime || ''}
                      onChange={(e) => updateContentBlock(block.id, { 
                        startTime: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {block.startTime ? `${Math.floor(block.startTime / 60)}:${(block.startTime % 60).toString().padStart(2, '0')}` : 'Start from beginning'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input
                      type="number"
                      placeholder="Auto"
                      min="0"
                      value={block.endTime || ''}
                      onChange={(e) => updateContentBlock(block.id, { 
                        endTime: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {block.endTime ? `${Math.floor(block.endTime / 60)}:${(block.endTime % 60).toString().padStart(2, '0')}` : 'Play until end'}
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Video Timing:</strong> Enter times in seconds (e.g., 90 = 1:30, 150 = 2:30).
                    {block.startTime && block.endTime && ` Duration: ${Math.max(0, block.endTime - block.startTime)}s`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {block.type === 'header' && (
                <h2 className="text-2xl font-bold break-words">{block.content}</h2>
              )}
              {block.type === 'subheader' && (
                <h3 className="text-xl font-semibold break-words">{block.content}</h3>
              )}
              {block.type === 'paragraph' && (
                <p className="text-muted-foreground whitespace-pre-wrap break-words">{block.content}</p>
              )}
              {block.type === 'image' && block.content && (
                <img
                  src={block.content}
                  alt="Content"
                  className="w-full h-40 object-cover rounded"
                />
              )}
              {(block.type === 'youtube_video' || block.type === 'embedded_video') && (
                <div className="bg-muted p-4 rounded text-center">
                  <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Video: {block.content}</p>
                  {(block.startTime || block.endTime) && (
                    <div className="mt-2 flex gap-4 justify-center text-xs text-muted-foreground">
                      {block.startTime && <span>Start: {Math.floor(block.startTime / 60)}:{(block.startTime % 60).toString().padStart(2, '0')}</span>}
                      {block.endTime && <span>End: {Math.floor(block.endTime / 60)}:{(block.endTime % 60).toString().padStart(2, '0')}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveBlock(block.id, 'up')}
                disabled={block.order === 0}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveBlock(block.id, 'down')}
                disabled={block.order === contentBlocks.length - 1}
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setBlockEditing(block.id, true)}
              >
                <Type className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteContentBlock(block.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
              {isDirty && (
                <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    You have unsaved changes
                  </p>
                </div>
              )}
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