
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/authProvider';
import { toast } from "sonner";

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // New prop to determine if auth is required
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  console.log('PrivateRoute: User authenticated?', Boolean(user), 'Loading?', loading, 'RequireAuth?', requireAuth);

  useEffect(() => {
    if (!loading && !user && requireAuth) {
      toast.error("Please sign in to access this page");
    }
  }, [user, loading, requireAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && requireAuth) {
    console.log('Auth required but not authenticated, redirecting to /sign-in');
    return <Navigate to="/sign-in" state={{ from: location.pathname }} />;
  }

  console.log('Rendering protected content, auth not required or user is authenticated');
  return <>{children}</>;
};

export default PrivateRoute;
