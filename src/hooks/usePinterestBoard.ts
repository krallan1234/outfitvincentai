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
  const [rateLimitRetryAt, setRateLimitRetryAt] = useState<number | null>(null);
  const { toast } = useToast();

  const connectPinterest = async () => {
    try {
      setLoading(true);
      console.log('Starting Pinterest OAuth flow...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const redirectUri = `${window.location.origin}/outfit`;

      console.log('Requesting auth URL from edge function...');
      const { data, error } = await supabase.functions.invoke('pinterest-auth', {
        body: {
          action: 'getAuthUrl',
          redirectUri,
          userId: user.id,
        },
      });

      console.log('Auth URL response:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('Failed to get auth URL:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize Pinterest connection',
          variant: 'destructive',
        });
        throw error;
      }

      // Open Pinterest OAuth in popup
      console.log('Opening OAuth popup...');
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
          console.log('OAuth callback received with code');
          window.removeEventListener('message', handleMessage);
          const { code } = event.data;

          // Exchange code for access token
          console.log('Exchanging code for token...');
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('pinterest-auth', {
            body: {
              action: 'exchangeCode',
              code,
              redirectUri,
              userId: user.id,
            },
          });

          console.log('Token exchange response:', { hasData: !!tokenData, hasError: !!tokenError });

          if (tokenError) {
            console.error('Token exchange failed:', tokenError);
            toast({
              title: 'Error',
              description: 'Failed to complete Pinterest authentication',
              variant: 'destructive',
            });
            throw tokenError;
          }

          if (tokenData?.error) {
            console.error('Pinterest auth error:', tokenData);
            toast({
              title: 'Pinterest Authentication Error',
              description: tokenData.details?.hint || tokenData.error,
              variant: 'destructive',
            });
            throw new Error(tokenData.error);
          }

          // Store access token in local state for board selection
          console.log('Storing access token, scopes:', tokenData.scope);
          sessionStorage.setItem('pinterest_access_token', tokenData.accessToken);

          toast({
            title: 'Success',
            description: `Connected to Pinterest! Scopes: ${tokenData.scope || 'N/A'}`,
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
      console.log('Fetching Pinterest boards...');
      
      // Check if we're currently rate limited
      if (rateLimitRetryAt && Date.now() < rateLimitRetryAt) {
        const secondsLeft = Math.ceil((rateLimitRetryAt - Date.now()) / 1000);
        toast({
          title: 'Rate Limited',
          description: `Please wait ${secondsLeft} seconds before trying again.`,
          variant: 'destructive',
        });
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const accessToken = sessionStorage.getItem('pinterest_access_token');
      
      if (!accessToken) {
        const error = 'No access token found. Please connect Pinterest first.';
        console.error(error);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        throw new Error(error);
      }

      console.log('Calling fetch-pinterest-board function...');
      const { data, error } = await supabase.functions.invoke('fetch-pinterest-board', {
        body: {
          userId: user.id,
          accessToken,
        },
      });

      console.log('Function response:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: 'Error',
          description: `Failed to fetch boards: ${error.message || 'Unknown error'}`,
          variant: 'destructive',
        });
        throw error;
      }

      // Handle rate limiting
      if (data?.rateLimited) {
        console.warn('Rate limited by Pinterest API');
        const retryAfter = data.details?.retryAfter || 60;
        setRateLimitRetryAt(Date.now() + (retryAfter * 1000));
        
        toast({
          title: 'Rate Limited',
          description: `Too many requests. Please wait ${retryAfter} seconds.`,
          variant: 'destructive',
        });
        return [];
      }

      // Handle authentication errors
      if (data?.requiresReauth) {
        console.error('Pinterest authentication failed:', data);
        sessionStorage.removeItem('pinterest_access_token');
        
        toast({
          title: 'Authentication Required',
          description: data.details?.hint || 'Please reconnect your Pinterest account.',
          variant: 'destructive',
        });
        return [];
      }

      // Handle general errors
      if (data?.error) {
        console.error('Pinterest API error:', data);
        const errorMsg = data.details?.hint || data.error || 'Failed to fetch boards';
        toast({
          title: 'Pinterest API Error',
          description: errorMsg,
          variant: 'destructive',
        });
        throw new Error(data.error);
      }

      // Handle no boards found
      if (data?.noBoardsFound) {
        console.log('No boards found - user may not have any Pinterest boards');
        toast({
          title: 'No Boards Found',
          description: 'No Pinterest boards found. The app will use general Pinterest trends instead.',
        });
        return [];
      }

      const boards = data.boards || [];
      console.log('Boards fetched successfully:', boards.length);
      return boards;

    } catch (error) {
      console.error('Error fetching boards:', error);
      if (error instanceof Error && !error.message.includes('Failed to fetch boards')) {
        toast({
          title: 'Error',
          description: 'Failed to fetch boards. Check console for details.',
          variant: 'destructive',
        });
      }
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
    rateLimitRetryAt,
  };
};
