import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PinterestCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      console.log('Pinterest OAuth callback page loaded');
      
      // Get the authorization code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      console.log('OAuth callback params:', { 
        hasCode: !!code, 
        error, 
        errorDescription 
      });

      if (error) {
        console.error('Pinterest OAuth error:', error, errorDescription);
        
        // Send error message to opener
        if (window.opener) {
          window.opener.postMessage({
            type: 'pinterest-oauth-error',
            error: error,
            description: errorDescription
          }, window.location.origin);
          window.close();
        } else {
          // If no opener, navigate back to outfit page with error
          navigate('/outfit?error=' + encodeURIComponent(error));
        }
        return;
      }

      if (code) {
        console.log('Authorization code received, sending to opener...');
        
        // Send the code to the opener window
        if (window.opener) {
          window.opener.postMessage({
            type: 'pinterest-oauth-success',
            code: code
          }, window.location.origin);
          
          console.log('Message sent to opener, closing popup...');
          
          // Close the popup after a brief delay
          setTimeout(() => {
            window.close();
          }, 500);
        } else {
          console.error('No opener window found');
          navigate('/outfit?error=no_opener');
        }
      } else {
        console.error('No authorization code or error in callback');
        navigate('/outfit?error=missing_code');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div className="text-lg font-medium">Connecting to Pinterest...</div>
        <div className="text-sm text-muted-foreground">
          This window will close automatically
        </div>
      </div>
    </div>
  );
};

export default PinterestCallback;
