import React, { useState } from 'react';
import {
  Plus,
  Type,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Video,
  Youtube,
  Quote,
  List,
  ListOrdered,
  Minus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContentBlock } from '@/hooks/useMagazine';

interface BlockType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'text' | 'media' | 'layout';
}

const BLOCK_TYPES: BlockType[] = [
  {
    id: 'paragraph',
    name: 'Paragraph',
    description: 'Add a paragraph of text',
    icon: Type,
    category: 'text'
  },
  {
    id: 'header',
    name: 'Header',
    description: 'Large heading text',
    icon: Heading1,
    category: 'text'
  },
  {
    id: 'subheader',
    name: 'Subheader',
    description: 'Medium heading text',
    icon: Heading2,
    category: 'text'
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Add a blockquote',
    icon: Quote,
    category: 'text'
  },
  {
    id: 'bullet_list',
    name: 'Bullet List',
    description: 'Create a bulleted list',
    icon: List,
    category: 'text'
  },
  {
    id: 'numbered_list',
    name: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    category: 'text'
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Upload or embed an image',
    icon: ImageIcon,
    category: 'media'
  },
  {
    id: 'youtube_video',
    name: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: Youtube,
    category: 'media'
  },
  {
    id: 'video',
    name: 'Video File',
    description: 'Upload a video file',
    icon: Video,
    category: 'media'
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'Add a visual separator',
    icon: Minus,
    category: 'layout'
  }
];

interface ModernContentBlockEditorProps {
  onAddBlock: (type: string, position?: number) => void;
  position?: number;
  className?: string;
}

export default function ModernContentBlockEditor({
  onAddBlock,
  position,
  className = ''
}: ModernContentBlockEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddBlock = (blockType: string) => {
    onAddBlock(blockType, position);
    setIsOpen(false);
  };

  const groupedBlocks = BLOCK_TYPES.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockType[]>);

  return (
    <div className={`flex justify-center py-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full p-0 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
          >
            {isOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="center"
          side="bottom"
        >
          <div className="p-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Add content block
            </h4>
            
            <div className="space-y-4">
              {Object.entries(groupedBlocks).map(([category, blocks]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {category === 'text' ? 'Text Blocks' : 
                     category === 'media' ? 'Media Blocks' : 
                     'Layout Blocks'}
                  </h5>
                  
                  <div className="grid grid-cols-1 gap-1">
                    {blocks.map((block) => {
                      const IconComponent = block.icon;
                      return (
                        <Button
                          key={block.id}
                          variant="ghost"
                          size="sm"
                          className="justify-start h-auto p-3 hover:bg-primary/5"
                          onClick={() => handleAddBlock(block.id)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                              <IconComponent className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">{block.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {block.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}