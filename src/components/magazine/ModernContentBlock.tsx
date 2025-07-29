import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Heading1,
  Heading2,
  Type,
  Image as ImageIcon,
  Video,
  Youtube,
  Quote,
  List,
  ListOrdered,
  Minus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Edit3,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SimpleImageUpload from '@/components/ui/SimpleImageUpload';
import { ContentBlock } from '@/hooks/useMagazine';
import { toast } from 'sonner';

interface ModernContentBlockProps {
  block: ContentBlock & { isEditing?: boolean };
  index: number;
  total: number;
  onUpdate: (id: number, updates: Partial<ContentBlock>) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: 'up' | 'down') => void;
  onDuplicate: (block: ContentBlock) => void;
  onToggleEdit: (id: number, editing: boolean) => void;
}

export default function ModernContentBlock({
  block,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
  onToggleEdit
}: ModernContentBlockProps) {
  const [localContent, setLocalContent] = useState(block.content);
  const [localStartTime, setLocalStartTime] = useState(block.startTime || 0);
  const [localEndTime, setLocalEndTime] = useState(block.endTime || 0);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state when block changes
  useEffect(() => {
    setLocalContent(block.content);
    setLocalStartTime(block.startTime || 0);
    setLocalEndTime(block.endTime || 0);
  }, [block.content, block.startTime, block.endTime]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && block.isEditing) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [localContent, block.isEditing]);

  // Auto-focus when editing
  useEffect(() => {
    if (block.isEditing) {
      const focusElement = inputRef.current || textareaRef.current;
      if (focusElement) {
        focusElement.focus();
        // Move cursor to end
        const length = focusElement.value.length;
        focusElement.setSelectionRange(length, length);
      }
    }
  }, [block.isEditing]);

  const handleSave = () => {
    const updates: Partial<ContentBlock> = { content: localContent.trim() };
    
    // Add timing data for YouTube videos
    if (block.type === 'youtube_video') {
      updates.startTime = localStartTime > 0 ? localStartTime : undefined;
      updates.endTime = localEndTime > 0 ? localEndTime : undefined;
    }
    
    onUpdate(block.id, updates);
    onToggleEdit(block.id, false);
    toast.success('Block updated successfully');
  };

  const handleCancel = () => {
    setLocalContent(block.content);
    setLocalStartTime(block.startTime || 0);
    setLocalEndTime(block.endTime || 0);
    onToggleEdit(block.id, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const getBlockIcon = () => {
    const iconClass = "w-4 h-4";
    switch (block.type) {
      case 'header': return <Heading1 className={iconClass} />;
      case 'subheader': return <Heading2 className={iconClass} />;
      case 'paragraph': return <Type className={iconClass} />;
      case 'quote': return <Quote className={iconClass} />;
      case 'bullet_list': return <List className={iconClass} />;
      case 'numbered_list': return <ListOrdered className={iconClass} />;
      case 'image': return <ImageIcon className={iconClass} />;
      case 'youtube_video': return <Youtube className={iconClass} />;
      case 'video': return <Video className={iconClass} />;
      case 'divider': return <Minus className={iconClass} />;
      default: return <Type className={iconClass} />;
    }
  };

  const getBlockLabel = () => {
    switch (block.type) {
      case 'header': return 'Header';
      case 'subheader': return 'Subheader';
      case 'paragraph': return 'Paragraph';
      case 'quote': return 'Quote';
      case 'bullet_list': return 'Bullet List';
      case 'numbered_list': return 'Numbered List';
      case 'image': return 'Image';
      case 'youtube_video': return 'YouTube Video';
      case 'video': return 'Video';
      case 'divider': return 'Divider';
      default: return 'Content';
    }
  };

  const extractYouTubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const formatTimeToMinutesSeconds = (seconds: number): string => {
    if (seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeFromInput = (timeStr: string): number => {
    if (!timeStr.trim()) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    // Only accept M:SS format, not plain seconds
    return 0;
  };

  const buildYouTubeEmbedUrl = (videoId: string, startTime?: number, endTime?: number): string => {
    const url = `https://www.youtube.com/embed/${videoId}`;
    const params = new URLSearchParams();
    
    if (startTime && startTime > 0) {
      params.set('start', startTime.toString());
    }
    
    if (endTime && endTime > 0) {
      params.set('end', endTime.toString());
    }
    
    const paramString = params.toString();
    return paramString ? `${url}?${paramString}` : url;
  };

  const renderEditingContent = () => {
    const commonProps = {
      value: localContent,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        setLocalContent(e.target.value),
      onKeyDown: handleKeyDown,
      className: "border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
    };

    switch (block.type) {
      case 'header':
        return (
          <Input
            ref={inputRef}
            placeholder="Enter header text..."
            className="text-2xl font-bold border-0 bg-transparent p-0 focus-visible:ring-0"
            {...commonProps}
          />
        );

      case 'subheader':
        return (
          <Input
            ref={inputRef}
            placeholder="Enter subheader text..."
            className="text-xl font-semibold border-0 bg-transparent p-0 focus-visible:ring-0"
            {...commonProps}
          />
        );

      case 'paragraph':
      case 'quote':
      case 'bullet_list':
      case 'numbered_list':
        return (
          <Textarea
            ref={textareaRef}
            placeholder={
              block.type === 'quote' ? 'Enter quote text...' :
              block.type === 'bullet_list' ? 'Enter list items (one per line)...' :
              block.type === 'numbered_list' ? 'Enter numbered list items (one per line)...' :
              'Enter paragraph text...'
            }
            rows={1}
            {...commonProps}
          />
        );

      case 'image':
        return (
          <SimpleImageUpload
            value={localContent}
            onChange={(url) => setLocalContent(url || '')}
            placeholder="Upload, paste, or drop an image"
            className="min-h-[100px]"
          />
        );

      case 'youtube_video':
      case 'video':
        return (
          <div className="space-y-3">
            <Input
              ref={inputRef}
              placeholder={
                block.type === 'youtube_video' 
                  ? 'Paste YouTube URL (e.g., https://youtube.com/watch?v=...)'
                  : 'Paste video URL or upload video file'
              }
              {...commonProps}
              className="border border-input"
            />
            
            {block.type === 'youtube_video' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Start Time (M:SS)
                  </label>
                  <Input
                    placeholder="0:00"
                    value={formatTimeToMinutesSeconds(localStartTime) || ''}
                    onChange={(e) => setLocalStartTime(parseTimeFromInput(e.target.value))}
                    className="border border-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    End Time (M:SS)
                  </label>
                  <Input
                    placeholder="Leave empty for full video"
                    value={formatTimeToMinutesSeconds(localEndTime) || ''}
                    onChange={(e) => setLocalEndTime(parseTimeFromInput(e.target.value))}
                    className="border border-input text-sm"
                  />
                </div>
              </div>
            )}
            
            {block.type === 'youtube_video' && localContent && extractYouTubeId(localContent) && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={buildYouTubeEmbedUrl(extractYouTubeId(localContent)!, localStartTime, localEndTime)}
                  className="w-full h-full"
                  allowFullScreen
                  title="YouTube video preview"
                />
              </div>
            )}
          </div>
        );

      case 'divider':
        return (
          <div className="py-4">
            <div className="border-t border-border" />
            <p className="text-center text-sm text-muted-foreground mt-2">
              Visual divider (no content needed)
            </p>
          </div>
        );

      default:
        return (
          <Textarea
            ref={textareaRef}
            placeholder="Enter content..."
            rows={3}
            {...commonProps}
          />
        );
    }
  };

  const renderViewContent = () => {
    if (!block.content && block.type !== 'divider') {
      return (
        <div className="text-muted-foreground italic py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getBlockIcon()}
            <span>Empty {getBlockLabel().toLowerCase()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleEdit(block.id, true)}
            className="text-xs"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Click to add content
          </Button>
        </div>
      );
    }

    switch (block.type) {
      case 'header':
        return <h1 className="text-3xl font-bold leading-tight">{block.content}</h1>;

      case 'subheader':
        return <h2 className="text-2xl font-semibold leading-tight">{block.content}</h2>;

      case 'paragraph':
        return (
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {block.content}
          </p>
        );

      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary pl-6 py-2 italic text-lg">
            {block.content}
          </blockquote>
        );

      case 'bullet_list':
        return (
          <ul className="list-disc list-inside space-y-1">
            {block.content.split('\n').filter(line => line.trim()).map((item, idx) => (
              <li key={idx} className="text-base">{item.trim()}</li>
            ))}
          </ul>
        );

      case 'numbered_list':
        return (
          <ol className="list-decimal list-inside space-y-1">
            {block.content.split('\n').filter(line => line.trim()).map((item, idx) => (
              <li key={idx} className="text-base">{item.trim()}</li>
            ))}
          </ol>
        );

      case 'image':
        return block.content ? (
          <div className="rounded-lg overflow-hidden">
            <img
              src={block.content}
              alt="Content image"
              className="w-full h-auto object-cover max-h-96"
            />
          </div>
        ) : null;

      case 'youtube_video':
        const videoId = extractYouTubeId(block.content);
        return videoId ? (
          <div className="space-y-2">
            {(block.startTime || block.endTime) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>⏱️</span>
                {block.startTime && <span>Start: {formatTimeToMinutesSeconds(block.startTime)}</span>}
                {block.startTime && block.endTime && <span>•</span>}
                {block.endTime && <span>End: {formatTimeToMinutesSeconds(block.endTime)}</span>}
              </div>
            )}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <iframe
                src={buildYouTubeEmbedUrl(videoId, block.startTime, block.endTime)}
                className="w-full h-full"
                allowFullScreen
                title="YouTube video"
              />
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Youtube className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Invalid YouTube URL</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleEdit(block.id, true)}
                className="mt-2"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit URL
              </Button>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-4">
            <div className="border-t border-border" />
          </div>
        );

      default:
        return (
          <div className="text-base whitespace-pre-wrap">
            {block.content}
          </div>
        );
    }
  };

  if (block.isEditing) {
    return (
      <Card className="border-primary shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="flex items-center gap-1.5">
              {getBlockIcon()}
              <span className="text-sm font-medium">{getBlockLabel()}</span>
            </Badge>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7">
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="h-7">
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>

          <div className="min-h-[40px]">
            {renderEditingContent()}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Press Ctrl+Enter to save • Esc to cancel
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`group relative hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Drag Handle */}
          <div className="flex items-start pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Content */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !block.isEditing && onToggleEdit(block.id, true)}
          >
            {renderViewContent()}
          </div>

          {/* Actions */}
          <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove(block.id, 'up')}
              disabled={index === 0}
              className="h-6 w-6 p-0"
              title="Move up"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove(block.id, 'down')}
              disabled={index === total - 1}
              className="h-6 w-6 p-0"
              title="Move down"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicate(block)}
              className="h-6 w-6 p-0"
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleEdit(block.id, true)}
              className="h-6 w-6 p-0"
              title="Edit"
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(block.id)}
              className="h-6 w-6 p-0 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Block type indicator */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
            {getBlockLabel()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}