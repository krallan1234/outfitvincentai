import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PinterestBoard {
  id: string;
  name: string;
  url?: string;
  pinsCount?: number;
}

export interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  link?: string;
  dominantColor?: string;
}

export const usePinterestBoard = () => {
  const [loading, setLoading] = useState(false);
  const [connectedBoard, setConnectedBoard] = useState<PinterestBoard | null>(null);
  const { toast } = useToast();

  const connectPinterest = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const redirectUri = `${window.location.origin}/outfit`;

      const { data, error } = await supabase.functions.invoke('pinterest-auth', {
        body: {
          action: 'getAuthUrl',
          redirectUri,
          userId: user.id,
        },
      });

      if (error) throw error;

      // Open Pinterest OAuth in popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        data.authUrl,
        'Pinterest OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'pinterest-oauth-success') {
          window.removeEventListener('message', handleMessage);
          const { code } = event.data;

          // Exchange code for access token
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('pinterest-auth', {
            body: {
              action: 'exchangeCode',
              code,
              redirectUri,
              userId: user.id,
            },
          });

          if (tokenError) throw tokenError;

          // Store access token in local state for board selection
          sessionStorage.setItem('pinterest_access_token', tokenData.accessToken);

          toast({
            title: 'Success',
            description: 'Connected to Pinterest! Now select a board.',
          });

          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup is closed
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 500);

    } catch (error) {
      console.error('Pinterest connection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to Pinterest',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const fetchBoards = async (): Promise<PinterestBoard[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const accessToken = sessionStorage.getItem('pinterest_access_token');
      if (!accessToken) throw new Error('Not connected to Pinterest');

      const { data, error } = await supabase.functions.invoke('fetch-pinterest-board', {
        body: {
          userId: user.id,
          accessToken,
        },
      });

      if (error) throw error;
      return data.boards || [];

    } catch (error) {
      console.error('Fetch boards error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch boards',
        variant: 'destructive',
      });
      return [];
    }
  };

  const selectBoard = async (boardId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const accessToken = sessionStorage.getItem('pinterest_access_token');
      if (!accessToken) throw new Error('Not connected to Pinterest');

      const { data, error } = await supabase.functions.invoke('fetch-pinterest-board', {
        body: {
          userId: user.id,
          accessToken,
          boardId,
        },
      });

      if (error) throw error;

      setConnectedBoard(data.board);
      
      toast({
        title: 'Success',
        description: `Connected to board: ${data.board.name}`,
      });

      return data;

    } catch (error) {
      console.error('Select board error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect board',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getConnectedBoard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('pinterest_boards')
        .select('*')
        .eq('user_id', user.id)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const pinsData = data.pins_data as any[];
        setConnectedBoard({
          id: data.board_id,
          name: data.board_name,
          url: data.board_url || undefined,
          pinsCount: Array.isArray(pinsData) ? pinsData.length : 0,
        });
      }

      return data;

    } catch (error) {
      console.error('Get connected board error:', error);
      return null;
    }
  };

  return {
    loading,
    connectedBoard,
    connectPinterest,
    fetchBoards,
    selectBoard,
    getConnectedBoard,
  };
};
