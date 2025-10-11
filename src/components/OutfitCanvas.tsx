import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Image as FabricImage } from "fabric";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Undo, Redo, Download, Grid3x3, Loader2 } from "lucide-react";

interface WardrobeItem {
  id: string;
  image_url: string;
  category?: string | null;
  color?: string | null;
  brand?: string | null;
}

interface OutfitCanvasProps {
  selectedItems: WardrobeItem[];
  mood?: string;
  occasion?: string;
  onSaveOutfit?: (canvasData: any) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

export const OutfitCanvas = ({ selectedItems, mood, occasion, onSaveOutfit }: OutfitCanvasProps) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const { toast } = useToast();

  // Init Fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return;

    const fabric = new FabricCanvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true,
    });

    // Snap to grid on move
    fabric.on("object:moving", (e: any) => {
      if (!snapToGrid || !e.target) return;
      const t = e.target;
      t.left = Math.round((t.left || 0) / GRID_SIZE) * GRID_SIZE;
      t.top = Math.round((t.top || 0) / GRID_SIZE) * GRID_SIZE;
    });

    fabricRef.current = fabric;

    return () => {
      fabric.dispose();
      fabricRef.current = null;
    };
  }, [snapToGrid]);

  // Record history when objects change
  useEffect(() => {
    const fabric = fabricRef.current;
    if (!fabric) return;

    const record = () => {
      const json = JSON.stringify(fabric.toJSON());
      setHistory(prev => {
        const newHistory = prev.slice(0, historyStep + 1).concat(json);
        setHistoryStep(newHistory.length - 1);
        return newHistory;
      });
    };

    fabric.on("object:modified", record);
    fabric.on("object:added", record);

    return () => {
      fabric.off("object:modified", record);
      fabric.off("object:added", record);
    };
  }, [historyStep]);

  // Load selected wardrobe items as images onto the canvas
  useEffect(() => {
    const fabric = fabricRef.current;
    if (!fabric) return;

    // Prevent duplicates by tracking existing image URLs
    const existingUrls = new Set<string>();
    fabric.getObjects().forEach((obj: any) => {
      if (obj.type === "image" && obj._originSrc) existingUrls.add(obj._originSrc);
    });

    selectedItems.forEach((item, idx) => {
      if (!item.image_url || existingUrls.has(item.image_url)) return;

      // Use FabricImage.fromURL with crossOrigin (v6 returns a Promise)
      FabricImage.fromURL(item.image_url, { crossOrigin: "anonymous" })
        .then((img) => {
          if (!img) return;
          const maxW = 140;
          const naturalW = (img.width as number) || maxW;
          const scale = maxW / naturalW;
          img.set({
            left: 60 + idx * 160,
            top: 80,
            scaleX: scale,
            scaleY: scale,
            hasControls: true,
            hasBorders: true,
            cornerStyle: "circle",
            cornerColor: "#888",
            transparentCorners: false,
          });
          (img as any)._originSrc = item.image_url;
          (img as any)._meta = { category: item.category, color: item.color, brand: item.brand };
          fabric.add(img);
          fabric.setActiveObject(img);
          fabric.requestRenderAll();
        })
        .catch((err) => {
          console.warn("Failed to load image", item.image_url, err);
        });
    });
  }, [selectedItems]);

  const undo = () => {
    const fabric = fabricRef.current;
    if (!fabric || historyStep <= 0) return;
    const prevStep = historyStep - 1;
    fabric.loadFromJSON(JSON.parse(history[prevStep]), () => fabric.requestRenderAll());
    setHistoryStep(prevStep);
  };

  const redo = () => {
    const fabric = fabricRef.current;
    if (!fabric || historyStep >= history.length - 1) return;
    const nextStep = historyStep + 1;
    fabric.loadFromJSON(JSON.parse(history[nextStep]), () => fabric.requestRenderAll());
    setHistoryStep(nextStep);
  };

  const exportAsImage = () => {
    const fabric = fabricRef.current;
    if (!fabric) return;
    const dataUrl = fabric.toDataURL({ format: "png", multiplier: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `outfit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Exported", description: "Outfit saved as image" });
  };

  const generateAISuggestions = async () => {
    const fabric = fabricRef.current;
    if (!fabric) return;
    if (fabric.getObjects().length === 0) {
      toast({ title: "No items", description: "Add items to canvas first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      // Build items meta from objects
      const items = fabric.getObjects().map((obj: any) => obj._meta || {});
      const { data, error } = await supabase.functions.invoke("canvas-ai-suggestions", {
        body: { items, mood, occasion },
      });
      if (error) throw error;
      setAiSuggestions(data.suggestions || "");
      toast({ title: "AI Suggestions Ready", description: "See tips below" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Failed to generate", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          Outfit Canvas
        </CardTitle>
        <CardDescription>Drag items to arrange; resize/rotate with handles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyStep <= 0}>
            <Undo className="h-4 w-4 mr-1" /> Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyStep < 0 || historyStep >= history.length - 1}
          >
            <Redo className="h-4 w-4 mr-1" /> Redo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSnapToGrid((v) => !v)}>
            <Grid3x3 className="h-4 w-4 mr-1" /> {snapToGrid ? "Grid On" : "Grid Off"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={generateAISuggestions}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            AI Suggestions
          </Button>
          <Button variant="outline" size="sm" onClick={exportAsImage}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>

        {/* Canvas wrapper - add key to force remount on major changes */}
        <div
          key="canvas-wrapper"
          className="relative border rounded-lg overflow-hidden bg-white"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          {snapToGrid && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  `linear-gradient(to right, #ccc 1px, transparent 1px),` +
                  `linear-gradient(to bottom, #ccc 1px, transparent 1px)`,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />
          )}
          <canvas ref={canvasElRef} />
        </div>

        {aiSuggestions && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Styling Suggestions
            </h4>
            <p className="text-sm whitespace-pre-wrap">{aiSuggestions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};