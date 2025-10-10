import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  outfit_id: string;
  user_id: string;
  parent_comment_id?: string;
  comment_text: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  is_liked?: boolean;
  replies?: Comment[];
}

export const useComments = (outfitId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchComments = async () => {
    if (!outfitId) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('outfit_comments')
        .select('*')
        .eq('outfit_id', outfitId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Fetch user profiles for display names
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      // Get user's comment likes
      if (user) {
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id);
        
        if (likes) {
          setUserLikes(new Set(likes.map(like => like.comment_id)));
        }
      }

      // Build comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsData?.forEach(comment => {
        const enrichedComment: Comment = {
          ...comment,
          user_display_name: profileMap.get(comment.user_id) || 'Anonymous',
          is_liked: user ? userLikes.has(comment.id) : false,
          replies: []
        };
        commentMap.set(comment.id, enrichedComment);

        if (!comment.parent_comment_id) {
          rootComments.push(enrichedComment);
        }
      });

      // Attach replies to parents
      commentsData?.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          const child = commentMap.get(comment.id);
          if (parent && child) {
            parent.replies?.push(child);
          }
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (text: string, parentCommentId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please log in to comment',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('outfit_comments')
        .insert({
          outfit_id: outfitId,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          comment_text: text
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Comment posted',
      });

      await fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please log in to like comments',
          variant: 'destructive',
        });
        return;
      }

      const isLiked = userLikes.has(commentId);

      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);

        if (error) throw error;

        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            user_id: user.id,
            comment_id: commentId
          });

        if (error) throw error;

        setUserLikes(prev => new Set([...prev, commentId]));
      }

      await fetchComments();
    } catch (error) {
      console.error('Error toggling comment like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (outfitId) {
      fetchComments();
    }
  }, [outfitId]);

  return {
    comments,
    loading,
    addComment,
    toggleCommentLike,
    refetch: fetchComments
  };
};
