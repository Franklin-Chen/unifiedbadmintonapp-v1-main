import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api'; // Use relative path without extension

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Store user info { userId, name, email }
    const [token, setToken] = useState(localStorage.getItem('uba_token')); // Load token initially
    const [loading, setLoading] = useState(true); // Loading state for initial auth check

    // Use useCallback to memoize verifyUser function
    const verifyUser = useCallback(async () => {
        const currentToken = localStorage.getItem('uba_token'); // Get current token
        if (currentToken) {
            try {
                console.log("Verifying token...");
                const response = await api.get('/auth/me');
                setUser(response.data);
                console.log("Token verified, user set:", response.data);
                if (token !== currentToken) {
                    setToken(currentToken);
                }
            } catch (error) {
                console.error("Token verification failed:", error.response?.data?.error || error.message);
                localStorage.removeItem('uba_token');
                setToken(null);
                setUser(null);
            }
        } else {
            setUser(null);
            if (token !== null) {
                setToken(null);
            }
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        verifyUser();
    }, [verifyUser]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token: newToken, ...userData } = response.data;

            localStorage.setItem('uba_token', newToken);
            setToken(newToken);
            // Set user state immediately after successful login
            setUser({
                userId: userData.userId,
                name: userData.name,
                email: userData.email
            });
            console.log("User set immediately after login:", userData);
            setLoading(false); // Explicitly set loading false after user is set
            return response.data;
        } catch (error) {
            console.error("Login failed:", error.response?.data?.error || error.message);
            localStorage.removeItem('uba_token');
            setToken(null);
            setUser(null);
            setLoading(false);
            throw error;
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await api.post('/auth/register', { name, email, password });
            return response.data;
        } catch (error) {
            console.error("Registration failed:", error.response?.data?.error || error.message);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('uba_token');
        setToken(null);
        setUser(null);
        console.log("User logged out");
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};