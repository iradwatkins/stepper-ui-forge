import React, { useState, useCallback } from 'react';
import {
  Heading1,
  Heading2,
  Type,
  Image as ImageIcon,
  Video,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SimpleImageUpload from '@/components/ui/SimpleImageUpload';
import { ContentBlock } from '@/hooks/useMagazine';
import { toast } from 'sonner';

interface EnhancedContentBlockProps {
  block: ContentBlock & { isEditing?: boolean };
  index: number;
  total: number;
  onUpdate: (id: number, updates: Partial<ContentBlock>) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: 'up' | 'down') => void;
  onDuplicate: (block: ContentBlock) => void;
  onToggleEdit: (id: number, editing: boolean) => void;
}

export default function EnhancedContentBlock({
  block,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
  onToggleEdit
}: EnhancedContentBlockProps) {
  const [localContent, setLocalContent] = useState(block.content);

  const handleSave = () => {
    onUpdate(block.id, { content: localContent });
    onToggleEdit(block.id, false);
  };

  const handleCancel = () => {
    setLocalContent(block.content);
    onToggleEdit(block.id, false);
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case 'header': return <Heading1 className="w-4 h-4" />;
      case 'subheader': return <Heading2 className="w-4 h-4" />;
      case 'paragraph': return <Type className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'youtube_video':
      case 'embedded_video': return <Video className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const getBlockLabel = () => {
    switch (block.type) {
      case 'header': return 'Header';
      case 'subheader': return 'Subheader';
      case 'paragraph': return 'Paragraph';
      case 'image': return 'Image';
      case 'youtube_video': return 'YouTube Video';
      case 'embedded_video': return 'Embedded Video';
      default: return 'Content';
    }
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  if (block.isEditing) {
    return (
      <Card className="border-primary shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="flex items-center gap-1">
              {getBlockIcon()}
              {getBlockLabel()}
            </Badge>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>

          {(block.type === 'header' || block.type === 'subheader') && (
            <Input
              placeholder={`Enter ${block.type} text...`}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          )}

          {block.type === 'paragraph' && (
            <Textarea
              placeholder="Enter paragraph content..."
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              rows={6}
              className="resize-none"
              autoFocus
            />
          )}

          {block.type === 'image' && (
            <SimpleImageUpload
              value={localContent}
              onChange={(url) => setLocalContent(url || '')}
              placeholder="Upload, paste, or drop an image"
            />
          )}

          {(block.type === 'youtube_video' || block.type === 'embedded_video') && (
            <div className="space-y-4">
              <Input
                placeholder="Paste YouTube URL or embed code..."
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                autoFocus
              />
              {block.type === 'youtube_video' && localContent && extractYouTubeId(localContent) && (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(localContent)}`}
                    className="w-full h-full rounded"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Drag Handle */}
          <div className="flex items-center text-muted-foreground">
            <GripVertical className="w-5 h-5 cursor-move" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {block.type === 'header' && (
              <h2 className="text-2xl font-bold">{block.content || 'Empty header'}</h2>
            )}
            {block.type === 'subheader' && (
              <h3 className="text-xl font-semibold">{block.content || 'Empty subheader'}</h3>
            )}
            {block.type === 'paragraph' && (
              <p className="text-base whitespace-pre-wrap">
                {block.content || 'Empty paragraph'}
              </p>
            )}
            {block.type === 'image' && block.content && (
              <img
                src={block.content}
                alt="Content"
                className="w-full max-h-64 object-cover rounded"
              />
            )}
            {block.type === 'youtube_video' && block.content && extractYouTubeId(block.content) && (
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(block.content)}`}
                  className="w-full h-full rounded"
                  allowFullScreen
                />
              </div>
            )}
            {!block.content && (
              <p className="text-muted-foreground italic">Empty {getBlockLabel().toLowerCase()}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove(block.id, 'up')}
              disabled={index === 0}
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove(block.id, 'down')}
              disabled={index === total - 1}
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicate(block)}
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleEdit(block.id, true)}
              title="Edit"
            >
              {getBlockIcon()}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(block.id)}
              title="Delete"
              className="hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}