
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/authProvider';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('PrivateRoute: User authenticated?', Boolean(user), 'Loading?', loading);

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
    return <Navigate to="/sign-in" />;
  }

  console.log('Authenticated, rendering protected content');
  return <>{children}</>;
};

export default PrivateRoute;
