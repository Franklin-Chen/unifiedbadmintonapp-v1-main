import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login'); // Redirect after logout
    };

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold">
                    Unified Badminton App
                </Link>
                <div className="space-x-4">
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="hover:text-gray-300">Dashboard</Link>
                            <Link to="/groups/open" className="hover:text-gray-300">Find Groups</Link>
                            <Link to="/groups/create" className="hover:text-gray-300">Create Group</Link>
                            <Link to="/my-registrations" className="hover:text-gray-300">My Events</Link>
                            <span className="text-gray-400">Hi, {user?.name}</span>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-gray-300">Login</Link>
                            <Link to="/register" className="hover:text-gray-300">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;