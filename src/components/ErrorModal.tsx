import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, Info, Upload } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    type: 'no-items' | 'api-error' | 'generation-failed' | 'upload-failed' | 'generic';
    title: string;
    message: string;
    suggestion?: string;
  };
}

export const ErrorModal = ({ isOpen, onClose, error }: ErrorModalProps) => {
  const getIcon = () => {
    switch (error.type) {
      case 'no-items':
        return <Upload className="h-12 w-12 text-blue-500 mx-auto" />;
      case 'api-error':
      case 'generation-failed':
        return <XCircle className="h-12 w-12 text-destructive mx-auto" />;
      case 'upload-failed':
        return <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />;
      default:
        return <Info className="h-12 w-12 text-muted-foreground mx-auto" />;
    }
  };

  const getSuggestion = () => {
    switch (error.type) {
      case 'no-items':
        return 'Upload at least 5-10 clothing items to get started. The more items you have, the better outfit combinations AI can create!';
      case 'api-error':
        return 'This is usually temporary. Please wait a moment and try again.';
      case 'generation-failed':
        return 'Try adjusting your prompt or selecting different items. Make sure your selections don\'t conflict (e.g., two tops).';
      case 'upload-failed':
        return 'Make sure your image is in JPG, PNG, or WebP format and under 5MB.';
      default:
        return error.suggestion || 'Please try again or contact support if the problem persists.';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md" aria-labelledby="error-dialog-title" aria-describedby="error-dialog-description">
        <AlertDialogHeader>
          <div className="mb-4">
            {getIcon()}
          </div>
          <AlertDialogTitle id="error-dialog-title" className="text-center">
            {error.title}
          </AlertDialogTitle>
          <AlertDialogDescription id="error-dialog-description" className="text-center space-y-3">
            <p>{error.message}</p>
            <div className="p-3 bg-muted rounded-lg text-left">
              <p className="text-sm font-medium mb-1">💡 Suggestion:</p>
              <p className="text-sm text-muted-foreground">{getSuggestion()}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose} className="w-full">
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Hook for managing error modals
export const useErrorModal = () => {
  const [errorState, setErrorState] = useState<{
    isOpen: boolean;
    error: ErrorModalProps['error'] | null;
  }>({
    isOpen: false,
    error: null,
  });

  const showError = (error: ErrorModalProps['error']) => {
    setErrorState({ isOpen: true, error });
  };

  const closeError = () => {
    setErrorState({ isOpen: false, error: null });
  };

  return { errorState, showError, closeError };
};
