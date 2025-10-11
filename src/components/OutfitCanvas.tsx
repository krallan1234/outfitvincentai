import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Undo, Redo, Download, Grid3x3, Loader2 } from 'lucide-react';
import Konva from 'konva';

interface OutfitCanvasProps {
  selectedItems: any[];
  mood?: string;
  occasion?: string;
  onSaveOutfit?: (canvasData: any) => void;
}

interface CanvasItem {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: HTMLImageElement | null;
  rotation: number;
  category?: string;
  color?: string;
  brand?: string;
}

const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export const OutfitCanvas = ({ selectedItems, mood, occasion, onSaveOutfit }: OutfitCanvasProps) => {
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<CanvasItem[][]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState('');
  const stageRef = useRef<Konva.Stage>(null);
  const { toast } = useToast();

  // Load images when selected items change
  useEffect(() => {
    selectedItems.forEach((item, index) => {
      if (!canvasItems.find(ci => ci.id === item.id)) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = item.image_url;
        img.onload = () => {
          const newItem: CanvasItem = {
            id: item.id,
            imageUrl: item.image_url,
            x: 100 + index * 120,
            y: 100,
            width: 100,
            height: 100,
            image: img,
            rotation: 0,
            category: item.category,
            color: item.color,
            brand: item.brand
          };
          setCanvasItems(prev => {
            const updated = [...prev, newItem];
            saveToHistory(updated);
            return updated;
          });
        };
      }
    });
  }, [selectedItems]);

  const saveToHistory = (items: CanvasItem[]) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(JSON.parse(JSON.stringify(items)));
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setCanvasItems(JSON.parse(JSON.stringify(history[historyStep - 1])));
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setCanvasItems(JSON.parse(JSON.stringify(history[historyStep + 1])));
    }
  };

  const handleDragEnd = (id: string, e: any) => {
    const items = canvasItems.map(item => {
      if (item.id === id) {
        let x = e.target.x();
        let y = e.target.y();
        
        if (snapToGrid) {
          x = Math.round(x / GRID_SIZE) * GRID_SIZE;
          y = Math.round(y / GRID_SIZE) * GRID_SIZE;
        }
        
        return { ...item, x, y };
      }
      return item;
    });
    setCanvasItems(items);
    saveToHistory(items);
  };

  const handleTransformEnd = (id: string, node: any) => {
    const items = canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
          rotation: node.rotation()
        };
      }
      return item;
    });
    setCanvasItems(items);
    saveToHistory(items);
    node.scaleX(1);
    node.scaleY(1);
  };

  const generateAISuggestions = async () => {
    if (canvasItems.length === 0) {
      toast({ title: 'No items', description: 'Add items to canvas first', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('canvas-ai-suggestions', {
        body: {
          items: canvasItems.map(item => ({
            category: item.category,
            color: item.color,
            brand: item.brand
          })),
          mood,
          occasion
        }
      });

      if (error) throw error;

      setAiSuggestions(data.suggestions);
      toast({ title: 'AI Suggestions Ready!', description: 'Check the suggestions below' });
    } catch (error: any) {
      console.error('AI suggestions error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate suggestions', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsImage = () => {
    if (!stageRef.current) return;

    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `outfit-${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'Exported!', description: 'Outfit saved as image' });
  };

  const saveOutfit = () => {
    if (onSaveOutfit) {
      onSaveOutfit({
        items: canvasItems,
        mood,
        occasion,
        suggestions: aiSuggestions
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          Outfit Canvas
        </CardTitle>
        <CardDescription>
          Drag items onto canvas to create your outfit arrangement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyStep === 0}
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyStep === history.length - 1}
          >
            <Redo className="h-4 w-4 mr-1" />
            Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapToGrid(!snapToGrid)}
          >
            <Grid3x3 className="h-4 w-4 mr-1" />
            {snapToGrid ? 'Grid On' : 'Grid Off'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={generateAISuggestions}
            disabled={isGenerating || canvasItems.length === 0}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            AI Suggestions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsImage}
            disabled={canvasItems.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <Stage
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            ref={stageRef}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedId(null);
              }
            }}
            onTouchStart={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedId(null);
              }
            }}
          >
            <Layer>
              {canvasItems.map((item) => (
                <ImageNode
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                  onDragEnd={(e) => handleDragEnd(item.id, e)}
                  onTransformEnd={(node) => handleTransformEnd(item.id, node)}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {aiSuggestions && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Styling Suggestions
            </h4>
            <p className="text-sm whitespace-pre-wrap">{aiSuggestions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ImageNode = ({ item, isSelected, onSelect, onDragEnd, onTransformEnd }: any) => {
  const shapeRef = useRef<any>();
  const trRef = useRef<any>();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        image={item.image}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        onDragEnd={onDragEnd}
        onTransformEnd={() => onTransformEnd(shapeRef.current)}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
