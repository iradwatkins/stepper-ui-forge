import React from 'react';
import {
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
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDraggable } from '@dnd-kit/core';

interface BlockType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'text' | 'media' | 'layout';
  color: string;
}

const BLOCK_TYPES: BlockType[] = [
  {
    id: 'paragraph',
    name: 'Paragraph',
    description: 'Add a paragraph of text',
    icon: Type,
    category: 'text',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'header',
    name: 'Header',
    description: 'Large heading text',
    icon: Heading1,
    category: 'text',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'subheader',
    name: 'Subheader',
    description: 'Medium heading text',
    icon: Heading2,
    category: 'text',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Add a blockquote',
    icon: Quote,
    category: 'text',
    color: 'bg-amber-50 border-amber-200 hover:bg-amber-100'
  },
  {
    id: 'bullet_list',
    name: 'Bullet List',
    description: 'Create a bulleted list',
    icon: List,
    category: 'text',
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'numbered_list',
    name: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    category: 'text',
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Upload or embed an image',
    icon: ImageIcon,
    category: 'media',
    color: 'bg-rose-50 border-rose-200 hover:bg-rose-100'
  },
  {
    id: 'youtube_video',
    name: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: Youtube,
    category: 'media',
    color: 'bg-red-50 border-red-200 hover:bg-red-100'
  },
  {
    id: 'video',
    name: 'Video File',
    description: 'Upload a video file',
    icon: Video,
    category: 'media',
    color: 'bg-red-50 border-red-200 hover:bg-red-100'
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'Add a visual separator',
    icon: Minus,
    category: 'layout',
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  }
];

interface DraggableBlockItemProps {
  block: BlockType;
  onClick?: () => void;
}

function DraggableBlockItem({ block, onClick }: DraggableBlockItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.id}`,
    data: {
      type: 'palette-item',
      blockType: block.id
    }
  });

  const IconComponent = block.icon;

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        ${block.color}
        cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-105'}
        ${isDragging ? 'shadow-lg z-50' : 'hover:shadow-md'}
      `}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-2 rounded-lg bg-white/50">
            <IconComponent className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-900">{block.name}</h4>
            <p className="text-xs text-gray-600 mt-1 leading-tight">{block.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ContentBlockPaletteProps {
  onBlockAdd: (blockType: string) => void;
  className?: string;
}

export default function ContentBlockPalette({ onBlockAdd, className = '' }: ContentBlockPaletteProps) {
  const groupedBlocks = BLOCK_TYPES.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockType[]>);

  const categoryLabels = {
    text: 'Text Blocks',
    media: 'Media Blocks',
    layout: 'Layout Blocks'
  };

  const categoryIcons = {
    text: Type,
    media: ImageIcon,
    layout: Minus
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Plus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Content Blocks</h3>
        <Badge variant="secondary" className="text-xs">
          Drag or click to add
        </Badge>
      </div>

      {Object.entries(groupedBlocks).map(([category, blocks]) => {
        const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
        
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <CategoryIcon className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {blocks.map((block) => (
                <DraggableBlockItem
                  key={block.id}
                  block={block}
                  onClick={() => onBlockAdd(block.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium mb-1">💡 Pro Tips</p>
          <p className="text-xs">
            • Drag blocks directly into your article<br />
            • Click to add at the bottom<br />
            • Use keyboard shortcuts for faster editing
          </p>
        </div>
      </div>
    </div>
  );
}