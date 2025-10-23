import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// You can add role-based access control here too
interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        // You can show a loading spinner here while checking auth status
        return <div>Loading session...</div>;
    }

    if (!isAuthenticated) {
        // If the user is not logged in, redirect them to the login page
        return <Navigate to="/login" replace />;
    }
    
    // Optional: If you provide roles, check if the user has one of them
    if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
         // If the role doesn't match, you could redirect to an unauthorized page or home
        return <Navigate to="/" replace />;
    }

    // If the user is authenticated (and has the right role), render the nested component (e.g., Dashboard)
    return <Outlet />;
};

export default ProtectedRoute;

