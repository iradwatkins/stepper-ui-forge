import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { Type, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContentBlock } from '@/hooks/useMagazine';
import ContentBlockPalette from './ContentBlockPalette';
import DraggableContentBlock from './DraggableContentBlock';

interface ContentBlockWithEditing extends ContentBlock {
  isEditing?: boolean;
}

interface DragDropContentEditorProps {
  contentBlocks: ContentBlockWithEditing[];
  onBlocksChange: (blocks: ContentBlockWithEditing[]) => void;
  onBlockUpdate: (id: number, updates: Partial<ContentBlock>) => void;
  onBlockDelete: (id: number) => void;
  onBlockDuplicate: (block: ContentBlock) => void;
  onBlockToggleEdit: (id: number, editing: boolean) => void;
}

export default function DragDropContentEditor({
  contentBlocks,
  onBlocksChange,
  onBlockUpdate,
  onBlockDelete,
  onBlockDuplicate,
  onBlockToggleEdit
}: DragDropContentEditorProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isDragOverContent, setIsDragOverContent] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addBlock = (blockType: string, position?: number) => {
    const insertPosition = position !== undefined ? position : contentBlocks.length;
    const newBlock: ContentBlockWithEditing = {
      id: Date.now(),
      type: blockType as ContentBlock['type'],
      content: blockType === 'divider' ? '---' : '',
      order: insertPosition,
      isEditing: blockType !== 'divider'
    };

    // Update existing blocks' order if inserting in middle
    const updatedBlocks = contentBlocks.map(block => ({
      ...block,
      order: block.order >= insertPosition ? block.order + 1 : block.order
    }));

    const newBlocks = [...updatedBlocks, newBlock].sort((a, b) => a.order - b.order);
    onBlocksChange(newBlocks);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setIsDragOverContent(false);
      return;
    }

    // Check if dragging from palette over content area
    if (active.data.current?.type === 'palette-item' && over.id === 'content-area') {
      setIsDragOverContent(true);
    } else {
      setIsDragOverContent(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setIsDragOverContent(false);

    if (!over) return;

    // Handle drag from palette to content area
    if (active.data.current?.type === 'palette-item') {
      const blockType = active.data.current.blockType;
      if (over.id === 'content-area') {
        addBlock(blockType);
      } else if (over.data.current?.type === 'content-block') {
        // Insert before/after specific block
        const overBlock = contentBlocks.find(b => b.id === over.id);
        if (overBlock) {
          addBlock(blockType, overBlock.order + 1);
        }
      }
      return;
    }

    // Handle reordering existing blocks
    if (active.data.current?.type === 'content-block' && over.data.current?.type === 'content-block') {
      const activeIndex = contentBlocks.findIndex(block => block.id === active.id);
      const overIndex = contentBlocks.findIndex(block => block.id === over.id);

      if (activeIndex !== overIndex) {
        const newBlocks = arrayMove(contentBlocks, activeIndex, overIndex);
        // Update order property
        const reorderedBlocks = newBlocks.map((block, index) => ({
          ...block,
          order: index
        }));
        onBlocksChange(reorderedBlocks);
      }
    }
  };

  const getActiveItem = () => {
    if (!activeId) return null;
    
    // Check if it's a palette item
    if (typeof activeId === 'string' && activeId.startsWith('palette-')) {
      return null; // Will be handled by overlay
    }
    
    // Find the content block
    return contentBlocks.find(block => block.id === activeId);
  };

  const activeItem = getActiveItem();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Block Palette - Left Sidebar */}
        <div className="lg:col-span-1">
          <ContentBlockPalette onBlockAdd={addBlock} />
        </div>

        {/* Content Area - Main Area */}
        <div className="lg:col-span-3">
          <Card 
            className={`min-h-[400px] transition-all duration-200 ${
              isDragOverContent ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Article Content</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('paragraph')}
                  className="text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Block
                </Button>
              </div>

              <div
                id="content-area"
                className={`min-h-[300px] transition-all duration-200 ${
                  isDragOverContent ? 'bg-primary/10 border-2 border-dashed border-primary rounded-lg p-4' : ''
                }`}
              >
                {contentBlocks.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Type className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h4 className="text-lg font-medium mb-2">Start writing your article</h4>
                    <p className="text-sm mb-4">
                      Drag content blocks from the left panel or click "Add Block" to begin
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addBlock('header')}
                      >
                        Add Header
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addBlock('paragraph')}
                      >
                        Add Paragraph
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addBlock('image')}
                      >
                        Add Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <SortableContext 
                    items={contentBlocks.map(block => block.id)} 
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {contentBlocks
                        .sort((a, b) => a.order - b.order)
                        .map((block, index) => (
                          <DraggableContentBlock
                            key={block.id}
                            block={block}
                            index={index}
                            total={contentBlocks.length}
                            onUpdate={onBlockUpdate}
                            onDelete={onBlockDelete}
                            onDuplicate={onBlockDuplicate}
                            onToggleEdit={onBlockToggleEdit}
                          />
                        ))}
                    </div>
                  </SortableContext>
                )}

                {isDragOverContent && (
                  <div className="text-center py-8 text-primary font-medium">
                    <Plus className="w-8 h-8 mx-auto mb-2" />
                    Drop here to add content block
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <Card className="opacity-90 shadow-lg">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Moving: {activeItem.type}
              </div>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}