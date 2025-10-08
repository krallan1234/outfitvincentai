import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { usePinterestBoard, PinterestBoard } from '@/hooks/usePinterestBoard';
import { Switch } from '@/components/ui/switch';

interface PinterestBoardSelectorProps {
  onBoardConnected?: (connected: boolean) => void;
}

export const PinterestBoardSelector = ({ onBoardConnected }: PinterestBoardSelectorProps) => {
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [enabled, setEnabled] = useState(false);
  
  const { loading, connectedBoard, connectPinterest, fetchBoards, selectBoard } = usePinterestBoard();

  useEffect(() => {
    if (connectedBoard) {
      setEnabled(true);
      setSelectedBoardId(connectedBoard.id);
      onBoardConnected?.(true);
    }
  }, [connectedBoard]);

  const handleConnect = async () => {
    await connectPinterest();
    // After connection, fetch boards
    const userBoards = await fetchBoards();
    setBoards(userBoards);
  };

  const handleSelectBoard = async (boardId: string) => {
    setSelectedBoardId(boardId);
    try {
      await selectBoard(boardId);
      setEnabled(true);
      onBoardConnected?.(true);
    } catch (error) {
      setEnabled(false);
      onBoardConnected?.(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    onBoardConnected?.(checked && !!connectedBoard);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Pinterest Board Inspiration
        </Label>
        {connectedBoard && (
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        )}
      </div>

      {!connectedBoard ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Connect your Pinterest board to get outfit inspiration based on your saved pins.
          </p>
          <Button
            onClick={handleConnect}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect Pinterest
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" />
            <span>Connected to: <strong>{connectedBoard.name}</strong></span>
            {connectedBoard.pinsCount && (
              <span className="text-xs">({connectedBoard.pinsCount} pins)</span>
            )}
          </div>
          {enabled && (
            <p className="text-xs text-muted-foreground">
              AI will analyze your board pins to create outfits matching your Pinterest style.
            </p>
          )}
        </div>
      )}

      {boards.length > 0 && !connectedBoard && (
        <div className="space-y-2">
          <Label>Select a Board</Label>
          <Select value={selectedBoardId} onValueChange={handleSelectBoard}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a Pinterest board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
