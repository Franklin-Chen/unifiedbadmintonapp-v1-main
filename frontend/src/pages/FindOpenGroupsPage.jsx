import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api'; // Use relative path without extension
import Spinner from '../components/Layout/Spinner'; // Adjust path if needed

const FindOpenGroupsPage = () => {
    const [openGroups, setOpenGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [joinStatus, setJoinStatus] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOpenGroups = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/groups/open');
                setOpenGroups(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch open groups.');
                console.error("Fetch open groups error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOpenGroups();
    }, []);

    const handleJoinGroup = async (groupId) => {
        setJoinStatus(prev => ({ ...prev, [groupId]: 'joining' }));
        try {
            await api.post(`/groups/${groupId}/join`);
            setJoinStatus(prev => ({ ...prev, [groupId]: 'joined' }));
            alert('Successfully joined group!');
        } catch (err) {
            setJoinStatus(prev => ({ ...prev, [groupId]: 'error' }));
            alert(err.response?.data?.error || 'Failed to join group.');
            console.error("Join group error:", err);
        }
    };

    const getButtonState = (groupId) => {
        return joinStatus[groupId] || 'idle';
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Find Open Groups</h1>

            {loading && <div className="flex justify-center mt-10"><Spinner /></div>}
            {error && <p className="text-red-500 bg-red-100 p-3 rounded text-center">{error}</p>}

            {!loading && !error && (
                <>
                    {openGroups.length === 0 ? (
                        <p className="text-center text-gray-600 bg-white p-6 rounded shadow">No open groups found.</p>
                    ) : (
                        <div className="space-y-4">
                            {openGroups.map((group) => {
                                // ***** FIX: Use group.id from API response *****
                                const groupId = group.id;
                                const currentStatus = getButtonState(groupId);
                                const isDisabled = currentStatus === 'joining' || currentStatus === 'joined';
                                let buttonText = 'Join Group';
                                let buttonClass = 'bg-blue-500 hover:bg-blue-600';
                                if (currentStatus === 'joining') {
                                    buttonText = 'Joining...';
                                    buttonClass = 'bg-blue-300 cursor-not-allowed';
                                } else if (currentStatus === 'joined') {
                                    buttonText = 'Joined';
                                    buttonClass = 'bg-gray-400 cursor-not-allowed';
                                } else if (currentStatus === 'error') {
                                    buttonText = 'Retry Join';
                                    buttonClass = 'bg-red-500 hover:bg-red-600';
                                }

                                return (
                                    // ***** FIX: Use group.id from API response *****
                                    <div key={groupId} className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow">
                                            <h2 className="text-xl font-semibold text-gray-800">
                                                {/* ***** FIX: Use group.id from API response ***** */}
                                                <Link to={`/groups/${groupId}`} className="hover:underline hover:text-blue-600">{group.name}</Link>
                                            </h2>
                                            <p className="text-gray-600 text-sm mt-1">{group.description || 'No description.'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{group.memberCount || 0} members</p>
                                        </div>
                                        <div className="flex-shrink-0 w-full sm:w-auto">
                                            <button
                                                // ***** FIX: Use group.id from API response *****
                                                onClick={() => handleJoinGroup(groupId)}
                                                disabled={isDisabled}
                                                className={`w-full sm:w-auto px-4 py-2 rounded text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClass} ${isDisabled ? '' : 'focus:ring-blue-400'}`}
                                            >
                                                {buttonText}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
            <div className="mt-8 text-center">
                <Link to="/groups/join" className="text-blue-600 hover:underline">
                    Have an invite code for a private group? Join here.
                </Link>
            </div>
        </div>
    );
};

export default FindOpenGroupsPage;