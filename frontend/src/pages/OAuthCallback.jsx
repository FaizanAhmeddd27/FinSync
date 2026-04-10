import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '@/stores/authStore';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-execution (React StrictMode + dependency changes)
    if (hasRun.current) return;
    hasRun.current = true;

    const error = searchParams.get('error');
    if (error) {
      toast.error('Authentication failed. Please try again.');
      navigate('/login?error=' + error, { replace: true });
      return;
    }

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      // Store tokens directly
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Clean URL
      window.history.replaceState({}, document.title, '/auth/callback');

      // Now initialize the store (which will call /auth/me)
      useAuthStore.getState().initialize().then(() => {
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          toast.success('Welcome! Signed in successfully.');
          navigate('/dashboard', { replace: true });
        } else {
          toast.error('Authentication failed. Please try again.');
          navigate('/login?error=oauth_failed', { replace: true });
        }
      });
    } else {
      // No tokens in URL — check if already authenticated
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Authentication failed. Please try again.');
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }
  }, []); // Empty dependency array — run only once

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}