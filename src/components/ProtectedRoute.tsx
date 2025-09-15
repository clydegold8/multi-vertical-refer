import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'customer' | 'admin';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, customer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">Your profile is being set up. Please try again in a moment.</p>
        </div>
      </div>
    );
  }

  if (requireRole && customer.role !== requireRole) {
    return <Navigate to={customer.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}