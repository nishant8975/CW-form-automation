import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

// 1. Define the shape of your user and the context
interface User {
    id: string;
    full_name: string;
    email?: string; // Email might not always be present depending on fetch
    role: 'STUDENT' | 'FACULTY' | 'HOD' | string;
    // Add other fields from your profiles table if needed
    college_id?: string;
    branch?: string;
    class_name?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (accessToken: string, userData: User) => void;
    logout: () => void;
}

// 2. Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null); // Initial state set to null
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until check is done
    const navigate = useNavigate();
    const queryClient = useQueryClient(); // Get query client instance

    useEffect(() => {
        // This effect runs once when the app starts to check persisted session
        console.log("AuthProvider: Checking user session from localStorage...");
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const parsedUser: User = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                console.log("AuthProvider: Session restored for user", parsedUser.id);
            } catch (error) {
                console.error("AuthProvider: Failed to parse user from localStorage", error);
                // Clear potentially corrupted storage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        } else {
             console.log("AuthProvider: No active session found in localStorage.");
        }
        setIsLoading(false); // Finished initial check
    }, []); // Empty dependency array ensures this runs only once on mount

    const login = (accessToken: string, userData: User) => {
        console.log("AuthProvider: Logging in user", userData.id);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(accessToken);
        setUser(userData);

        // ✨ FIX: Invalidate relevant queries after successful login ✨
        // This ensures dashboards fetch fresh data after login
        console.log("AuthProvider: Invalidating dashboard queries after login...");
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
        queryClient.invalidateQueries({ queryKey: ['my-requests'] });

        // Redirect based on role (already handled in Login component, but can be done here too)
        // if (userData.role === 'STUDENT') {
        //     navigate('/student/dashboard');
        // } else {
        //     navigate('/faculty/dashboard');
        // }
    };

    const logout = () => {
        console.log("AuthProvider: Logging out user...");
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);

        // ✨ FIX: Remove queries on logout to clear cached data completely ✨
        console.log("AuthProvider: Removing dashboard queries from cache after logout...");
        queryClient.removeQueries({ queryKey: ['pending-requests'] });
        queryClient.removeQueries({ queryKey: ['my-requests'] });
        // Optionally clear all queries: queryClient.clear();

        navigate('/login'); // Redirect to login after logout
    };

    // Memoize the value to prevent unnecessary re-renders
    const value = React.useMemo(() => ({
         user,
         token,
         isAuthenticated: !!user && !!token, // Check both user and token
         isLoading,
         login,
         logout
     }), [user, token, isLoading]);


    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 4. Create a custom hook for easy access to the context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

