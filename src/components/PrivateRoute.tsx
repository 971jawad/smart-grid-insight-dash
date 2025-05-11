
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/authProvider';
import { toast } from "sonner";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  console.log('PrivateRoute: User authenticated?', Boolean(user), 'Loading?', loading);

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please sign in to access this page");
    }
  }, [user, loading]);

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

  if (!user) {
    console.log('Not authenticated, redirecting to /sign-in');
    return <Navigate to="/sign-in" state={{ from: location.pathname }} />;
  }

  console.log('Authenticated, rendering protected content');
  return <>{children}</>;
};

export default PrivateRoute;
