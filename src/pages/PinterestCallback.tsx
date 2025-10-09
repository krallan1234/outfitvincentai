import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PinterestCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Pinterest...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
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
          setStatus('error');
          setMessage(errorDescription || error || 'Authentication failed');
          
          // Redirect after showing error
          setTimeout(() => {
            const returnPath = sessionStorage.getItem('pinterest_oauth_return') || '/outfit';
            sessionStorage.removeItem('pinterest_oauth_return');
            sessionStorage.removeItem('pinterest_oauth_user_id');
            sessionStorage.removeItem('pinterest_oauth_redirect_uri');
            navigate(`${returnPath}?pinterest_error=${encodeURIComponent(error)}`);
          }, 2000);
          return;
        }

        if (!code) {
          console.error('No authorization code in callback');
          setStatus('error');
          setMessage('No authorization code received');
          
          setTimeout(() => {
            const returnPath = sessionStorage.getItem('pinterest_oauth_return') || '/outfit';
            sessionStorage.removeItem('pinterest_oauth_return');
            sessionStorage.removeItem('pinterest_oauth_user_id');
            sessionStorage.removeItem('pinterest_oauth_redirect_uri');
            navigate(`${returnPath}?pinterest_error=missing_code`);
          }, 2000);
          return;
        }

        console.log('Authorization code received, exchanging for token...');
        setMessage('Exchanging authorization code for access token...');

        const userId = sessionStorage.getItem('pinterest_oauth_user_id');
        const redirectUri = sessionStorage.getItem('pinterest_oauth_redirect_uri');

        if (!userId || !redirectUri) {
          throw new Error('Missing OAuth state - please try connecting again');
        }

        // Exchange code for access token
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('pinterest-auth', {
          body: {
            action: 'exchangeCode',
            code,
            redirectUri,
            userId,
          },
        });

        console.log('Token exchange response:', { hasData: !!tokenData, hasError: !!tokenError });

        if (tokenError) {
          console.error('Token exchange failed:', tokenError);
          throw new Error('Failed to complete Pinterest authentication');
        }

        if (tokenData?.error) {
          console.error('Pinterest auth error:', tokenData);
          throw new Error(tokenData.details?.hint || tokenData.error);
        }

        // Store access token for board selection
        console.log('Storing access token, scopes:', tokenData.scope);
        sessionStorage.setItem('pinterest_access_token', tokenData.accessToken);
        sessionStorage.setItem('pinterest_connected', 'true');

        setStatus('success');
        setMessage('Successfully connected to Pinterest!');

        // Redirect back to return path
        setTimeout(() => {
          const returnPath = sessionStorage.getItem('pinterest_oauth_return') || '/outfit';
          sessionStorage.removeItem('pinterest_oauth_return');
          sessionStorage.removeItem('pinterest_oauth_user_id');
          sessionStorage.removeItem('pinterest_oauth_redirect_uri');
          navigate(`${returnPath}?pinterest_success=true`);
        }, 1500);

      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect to Pinterest');
        
        setTimeout(() => {
          const returnPath = sessionStorage.getItem('pinterest_oauth_return') || '/outfit';
          sessionStorage.removeItem('pinterest_oauth_return');
          sessionStorage.removeItem('pinterest_oauth_user_id');
          sessionStorage.removeItem('pinterest_oauth_redirect_uri');
          navigate(`${returnPath}?pinterest_error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown')}`);
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="text-lg font-medium">{message}</div>
            <div className="text-sm text-muted-foreground">
              Please wait while we complete the connection...
            </div>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
            <div className="text-lg font-medium text-green-600">{message}</div>
            <div className="text-sm text-muted-foreground">
              Redirecting you back...
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div className="text-lg font-medium text-destructive">{message}</div>
            <div className="text-sm text-muted-foreground">
              You will be redirected back shortly...
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PinterestCallback;
