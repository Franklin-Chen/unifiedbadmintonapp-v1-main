import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api'; // Assuming api is your configured axios instance or similar
import { useAuth } from '../contexts/AuthContext'; // Assuming this context provides user info
import Spinner from '../components/Layout/Spinner'; // Assuming this is your loading spinner component

const DashboardPage = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, loading: authLoading } = useAuth(); // Get user and auth loading state

    useEffect(() => {
        const fetchGroups = async () => {
            console.log("DashboardPage: fetchGroups called"); // Log: Start fetching
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/groups'); // API endpoint for user's groups
                console.log("DashboardPage: API response data:", response.data); // Log: Log the raw API response data
                // Check if the response data is an array before setting
                if (Array.isArray(response.data)) {
                    setGroups(response.data);
                } else {
                    console.error("DashboardPage: API response is not an array:", response.data);
                    setError('Received invalid group data from server.');
                    setGroups([]); // Set to empty array on invalid data
                }
            } catch (err) {
                const errorMsg = err.response?.data?.error || 'Failed to fetch your groups.';
                setError(errorMsg);
                console.error("DashboardPage: Fetch groups error:", err.response || err);
                setGroups([]); // Clear groups on error
            } finally {
                console.log("DashboardPage: fetchGroups finally block"); // Log: Fetch finished
                setLoading(false);
            }
        };

        // Fetch groups only when authentication is done loading and user exists
        if (!authLoading && user) {
            console.log("DashboardPage: Auth loaded and user exists, fetching groups."); // Log: Condition met
            fetchGroups();
        } else if (!authLoading && !user) {
            // If auth is done but no user, clear groups and stop loading
            console.log("DashboardPage: Auth loaded but no user, clearing groups."); // Log: No user
            setGroups([]);
            setLoading(false);
        } else {
            console.log("DashboardPage: Waiting for auth loading..."); // Log: Waiting for auth
            // Keep loading true while auth is loading
            setLoading(true);
        }
        // Dependency array includes user and authLoading to refetch if they change
    }, [user, authLoading]);

    // Render loading state
    if (loading) { // Use the component's loading state which respects authLoading
        return <div className="container mx-auto p-4 flex justify-center mt-10"><Spinner /></div>;
    }

    // Render error state
    if (error) {
        return <div className="container mx-auto p-4 md:p-6"><p className="text-red-500 bg-red-100 p-3 rounded text-center">{error}</p></div>;
    }

    // Render main content when not loading and no error
    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">My Groups</h1>

            {/* Check if groups array is empty */}
            {groups.length === 0 ? (
                // Display message and action buttons if no groups
                <div className="text-center text-gray-600 bg-white p-6 rounded-lg shadow">
                    <p className="mb-4">You are not a member of any groups yet.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Link to="/groups/create" className="button-link bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors">
                            Create New Group
                        </Link>
                        <Link to="/groups/open" className="button-link bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">
                            Find Open Groups
                        </Link>
                        <Link to="/groups/join" className="button-link bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors">
                            Join Private Group
                        </Link>
                    </div>
                </div>
            ) : (
                // Display the grid of groups
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Map over the groups array */}
                    {groups.map((group) => {
                        // *** FIX: Use group.id directly as returned by the API ***
                        const groupId = group.id;

                        // Add a warning if the ID used for key/link is missing
                        if (groupId === undefined) {
                            console.warn("DashboardPage: Group object missing 'id' for key prop:", group);
                            // Use a fallback key ONLY if ID is missing to prevent crash, but log warning
                            return (
                                <div key={`group-index-${Math.random()}`} className="bg-red-100 p-4 rounded-lg shadow">
                                    Error: Group data is missing ID. Check console.
                                </div>
                            );
                        }

                        return (
                            // *** Use group.id for the key prop ***
                            <div key={groupId} className="bg-white p-4 rounded-lg shadow hover:shadow-xl transition-shadow duration-200 flex flex-col justify-between">
                                {/* Group details */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-1 text-gray-800">{group.name || 'Unnamed Group'}</h2>
                                    {/* Display visibility and role tags */}
                                    <div className="flex items-center mb-2 flex-wrap gap-1">
                                        {group.visibility && (
                                            <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded ${group.visibility === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {group.visibility}
                                            </span>
                                        )}
                                        {/* Display User Role */}
                                        {group.userRole && (
                                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${group.userRole === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {group.userRole}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mt-1 text-sm line-clamp-3">{group.description || 'No description provided.'}</p>
                                </div>
                                {/* Link to view the group */}
                                <div className="mt-4">
                                    {/* *** Use group.id for the Link *** */}
                                    <Link
                                        to={`/groups/${groupId}`}
                                        className="button-link inline-block w-full text-center bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        View Group
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Buttons (repeated at the bottom for convenience if groups exist) */}
            {groups.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link to="/groups/create" className="button-link bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors">
                        Create New Group
                    </Link>
                    <Link to="/groups/open" className="button-link bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors">
                        Find Open Groups
                    </Link>
                    <Link to="/groups/join" className="button-link bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors">
                        Join Private Group
                    </Link>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
