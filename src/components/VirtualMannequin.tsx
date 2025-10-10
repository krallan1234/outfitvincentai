import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, User, AlertCircle } from 'lucide-react';
import { ClothingItem } from '@/hooks/useClothes';
import { supabase } from '@/integrations/supabase/client';

interface VirtualMannequinProps {
  selectedItems: ClothingItem[];
  onFeedback?: (feedback: string, score: number) => void;
}

interface PositionedItem {
  item: ClothingItem;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const VirtualMannequin = ({ selectedItems, onFeedback }: VirtualMannequinProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [positionedItems, setPositionedItems] = useState<PositionedItem[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; score: number } | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Auto-position items when they're added
    if (selectedItems.length > 0) {
      autoPositionItems();
    }
  }, [selectedItems]);

  useEffect(() => {
    drawCanvas();
  }, [positionedItems]);

  useEffect(() => {
    // Get real-time feedback when items change
    if (selectedItems.length >= 2) {
      getRealTimeFeedback();
    } else {
      setFeedback(null);
    }
  }, [selectedItems]);

  const autoPositionItems = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const categoryPositions: Record<string, { x: number; y: number }> = {
      top: { x: canvas.width / 2 - 75, y: 80 },
      bottom: { x: canvas.width / 2 - 75, y: 220 },
      dress: { x: canvas.width / 2 - 75, y: 80 },
      outerwear: { x: canvas.width / 2 - 85, y: 60 },
      footwear: { x: canvas.width / 2 - 60, y: 380 },
      accessories: { x: canvas.width / 2 + 60, y: 40 },
    };

    const positioned = selectedItems.map((item) => {
      const category = item.category.toLowerCase();
      let basePosition = categoryPositions.top; // default

      // Find matching category
      for (const [key, pos] of Object.entries(categoryPositions)) {
        if (category.includes(key)) {
          basePosition = pos;
          break;
        }
      }

      return {
        item,
        x: basePosition.x,
        y: basePosition.y,
        width: 150,
        height: 120,
      };
    });

    setPositionedItems(positioned);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mannequin outline (simple silhouette)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Head
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 40, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 60);
    ctx.lineTo(canvas.width / 2, 180);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 60, 90);
    ctx.lineTo(canvas.width / 2, 80);
    ctx.lineTo(canvas.width / 2 + 60, 90);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 180);
    ctx.lineTo(canvas.width / 2 - 30, 280);
    ctx.moveTo(canvas.width / 2, 180);
    ctx.lineTo(canvas.width / 2 + 30, 280);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw clothing items
    positionedItems.forEach((posItem, index) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = posItem.item.image_url;
      
      img.onload = () => {
        // Draw shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw image with rounded corners
        ctx.save();
        roundRect(ctx, posItem.x, posItem.y, posItem.width, posItem.height, 8);
        ctx.clip();
        ctx.drawImage(img, posItem.x, posItem.y, posItem.width, posItem.height);
        ctx.restore();

        // Draw border
        ctx.strokeStyle = draggedItemIndex === index ? '#3b82f6' : '#d1d5db';
        ctx.lineWidth = 2;
        roundRect(ctx, posItem.x, posItem.y, posItem.width, posItem.height, 8);
        ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      };
    });
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const getRealTimeFeedback = async () => {
    try {
      setLoadingFeedback(true);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outfit-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: selectedItems.map(item => ({
            category: item.category,
            color: item.color,
            style: item.style,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get feedback');

      const data = await response.json();
      setFeedback({ text: data.feedback, score: data.score });
      onFeedback?.(data.feedback, data.score);
    } catch (error) {
      console.error('Error getting feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked item
    const clickedIndex = positionedItems.findIndex(
      (item) =>
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
    );

    if (clickedIndex !== -1) {
      setDraggedItemIndex(clickedIndex);
      setOffset({
        x: x - positionedItems[clickedIndex].x,
        y: y - positionedItems[clickedIndex].y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedItemIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPositionedItems((prev) =>
      prev.map((item, index) =>
        index === draggedItemIndex
          ? { ...item, x: x - offset.x, y: y - offset.y }
          : item
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedItemIndex(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Virtual Mannequin Preview
        </CardTitle>
        <CardDescription>
          Drag and drop items to visualize your outfit. AI provides real-time feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={450}
            className="w-full border rounded-lg bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {selectedItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center p-4">
              <div>
                <User className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select items from your wardrobe to preview here</p>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Feedback */}
        {selectedItems.length >= 2 && (
          <div className="space-y-2">
            {loadingFeedback ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">AI analyzing combination...</p>
              </div>
            ) : feedback ? (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">AI Feedback</span>
                  </div>
                  <Badge variant={getScoreBadgeVariant(feedback.score)}>
                    <span className={getScoreColor(feedback.score)}>
                      {feedback.score}% Match
                    </span>
                  </Badge>
                </div>
                <p className="text-sm">{feedback.text}</p>
              </div>
            ) : null}
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>Tip: Drag items to reposition them on the mannequin</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={autoPositionItems}
          className="w-full"
          disabled={selectedItems.length === 0}
        >
          Reset Positions
        </Button>
      </CardContent>
    </Card>
  );
};
