import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { useComments, Comment } from '@/hooks/useComments';
import { cn } from '@/lib/utils';

interface CommentsSectionProps {
  outfitId: string;
}

const CommentItem = ({ 
  comment, 
  onReply, 
  onLike 
}: { 
  comment: Comment; 
  onReply: (commentId: string) => void;
  onLike: (commentId: string) => void;
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user_display_name}</span>
            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-sm">{comment.comment_text}</p>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(comment.id)}
              className={cn(
                "h-7 px-2 text-xs",
                comment.is_liked && "text-red-500"
              )}
            >
              <Heart className={cn("h-3 w-3 mr-1", comment.is_liked && "fill-current")} />
              {comment.likes_count > 0 && comment.likes_count}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="h-7 px-2 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentsSection = ({ outfitId }: CommentsSectionProps) => {
  const { comments, loading, addComment, toggleCommentLike } = useComments(outfitId);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    await addComment(replyText, parentId);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {/* New Comment */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="flex-1"
        />
        <Button 
          onClick={handleSubmitComment}
          disabled={!newComment.trim()}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="space-y-3">
              <CommentItem
                comment={comment}
                onReply={handleReply}
                onLike={toggleCommentLike}
              />
              
              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-8 flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-4 text-muted-foreground">
          No comments yet. Be the first to comment!
        </div>
      )}
    </Card>
  );
};
