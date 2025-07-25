import React from 'react';
import { Eye, Smartphone, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentBlock } from '@/hooks/useMagazine';
import { cn } from '@/lib/utils';

interface ArticlePreviewProps {
  title: string;
  excerpt: string;
  featuredImage: string;
  category?: string;
  contentBlocks: ContentBlock[];
  viewMode: 'mobile' | 'tablet' | 'desktop';
  onViewModeChange: (mode: 'mobile' | 'tablet' | 'desktop') => void;
}

export default function ArticlePreview({
  title,
  excerpt,
  featuredImage,
  category,
  contentBlocks,
  viewMode,
  onViewModeChange
}: ArticlePreviewProps) {
  const getViewportWidth = () => {
    switch (viewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-2xl';
      case 'desktop': return 'max-w-4xl';
    }
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'header':
        return <h2 key={block.id} className="text-3xl font-bold mb-6 mt-8">{block.content}</h2>;
      case 'subheader':
        return <h3 key={block.id} className="text-2xl font-semibold mb-4 mt-6">{block.content}</h3>;
      case 'paragraph':
        return (
          <p key={block.id} className="text-lg leading-relaxed mb-6 text-muted-foreground">
            {block.content}
          </p>
        );
      case 'image':
        return block.content ? (
          <div key={block.id} className="my-8">
            <img
              src={block.content}
              alt="Article content"
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        ) : null;
      case 'youtube_video':
        const youtubeMatch = block.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const videoId = youtubeMatch ? youtubeMatch[1] : null;
        return videoId ? (
          <div key={block.id} className="my-8">
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'mobile' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'tablet' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'desktop' ? 'default' : 'outline'}
              onClick={() => onViewModeChange('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <div className="bg-background border rounded-lg h-full overflow-auto">
          <div className={cn("mx-auto p-6 transition-all duration-300", getViewportWidth())}>
            {/* Article Header */}
            {category && (
              <Badge variant="secondary" className="mb-4">
                {category}
              </Badge>
            )}
            
            <h1 className="text-4xl font-bold leading-tight mb-4">
              {title || 'Untitled Article'}
            </h1>

            {excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {excerpt}
              </p>
            )}

            {/* Featured Image */}
            {featuredImage && (
              <div className="mb-8">
                <img
                  src={featuredImage}
                  alt={title}
                  className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Content */}
            <div className="article-content">
              {contentBlocks.length > 0 ? (
                contentBlocks
                  .sort((a, b) => a.order - b.order)
                  .map(renderContentBlock)
              ) : (
                <p className="text-muted-foreground italic text-center py-12">
                  Start adding content blocks to see them here...
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}