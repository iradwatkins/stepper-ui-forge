import React from 'react';
import {
  Heading1,
  Heading2,
  Type,
  Image as ImageIcon,
  Video,
  Plus,
  FileText,
  List,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ContentBlock } from '@/hooks/useMagazine';

interface QuickInsertToolbarProps {
  onInsert: (type: ContentBlock['type']) => void;
  className?: string;
}

export default function QuickInsertToolbar({ onInsert, className = '' }: QuickInsertToolbarProps) {
  const blockTypes = [
    { type: 'header' as const, icon: Heading1, label: 'Header', shortcut: 'H' },
    { type: 'subheader' as const, icon: Heading2, label: 'Subheader', shortcut: 'S' },
    { type: 'paragraph' as const, icon: Type, label: 'Paragraph', shortcut: 'P' },
    { type: 'image' as const, icon: ImageIcon, label: 'Image', shortcut: 'I' },
    { type: 'youtube_video' as const, icon: Video, label: 'YouTube', shortcut: 'Y' },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid grid-cols-2 gap-2">
            {blockTypes.map(({ type, icon: Icon, label, shortcut }) => (
              <Button
                key={type}
                variant="outline"
                className="h-20 flex-col gap-2 relative"
                onClick={() => onInsert(type)}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{label}</span>
                <kbd className="absolute top-2 right-2 text-xs bg-muted px-1 rounded">
                  {shortcut}
                </kbd>
              </Button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Pro tip:</strong> Press "/" while editing to quickly insert blocks
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick buttons for common blocks */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onInsert('paragraph')}
          title="Add paragraph (P)"
        >
          <Type className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onInsert('image')}
          title="Add image (I)"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onInsert('header')}
          title="Add header (H)"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}