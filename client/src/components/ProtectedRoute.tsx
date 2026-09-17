import React from 'react';
import { Outlet } from 'react-router-dom';
import { usePermissions, type Action } from '../lib/AuthorizationService';
import Unauthorized from '../pages/Unauthorized';

interface ProtectedRouteProps {
  destinationId: string;
  action?: Action;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ destinationId, action = 'VIEW' }) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!hasPermission(destinationId, action)) {
    return <Unauthorized />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
