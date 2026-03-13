import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import EventList from '../components/Events/EventList'; // Uses the corrected EventList
import Spinner from '../components/Layout/Spinner.jsx';
import MemberList from '../components/Groups/MemberList';

const GroupDetailPage = () => {
    const { groupId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const isCurrentUserAdmin = currentUserRole === 'admin';

    const fetchGroupData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const groupRes = await api.get(`/groups/${groupId}`);
            setGroup(groupRes.data);
            setCurrentUserRole(groupRes.data.currentUserRole);

            if (groupRes.data.visibility === 'private' && groupRes.data.currentUserRole === 'admin') {
                if (!inviteCode || inviteCode === 'Generate Code') {
                    setInviteCode(groupRes.data.inviteCode || 'Generate Code');
                }
            }

            const [membersRes, eventsRes] = await Promise.all([
                api.get(`/groups/${groupId}/members`),
                api.get(`/groups/${groupId}/events`)
            ]);
            setMembers(membersRes.data);
            setEvents(eventsRes.data);

        } catch (err) {
            setError(err.response?.data?.error || `Failed to fetch group data.`);
            console.error("Fetch group data error:", err);
            if (err.response?.status === 403) {
                setError("You do not have permission to view this group.");
            } else if (err.response?.status === 404) {
                setError("Group not found.");
            }
        } finally {
            setLoading(false);
        }
    }, [groupId, user?.userId, inviteCode]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const handleLeaveGroup = async () => {
        if (window.confirm("Are you sure you want to leave this group?")) {
            setActionLoading(true);
            try {
                await api.delete(`/groups/${groupId}/leave`);
                alert("Successfully left the group.");
                navigate('/dashboard');
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to leave group.');
                console.error("Leave group error:", err);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleRemoveMember = async (memberIdToRemove) => {
        if (window.confirm(`Are you sure you want to remove this member?`)) {
            setActionLoading(true);
            try {
                await api.delete(`/groups/${groupId}/members/${memberIdToRemove}`);
                alert("Member removed successfully.");
                setMembers(prevMembers => prevMembers.filter(m => m.userId !== memberIdToRemove));
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to remove member.');
                console.error("Remove member error:", err);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleGetInviteCode = async () => {
        setActionLoading(true);
        try {
            const response = await api.get(`/groups/${groupId}/invite-code`);
            const code = response.data.inviteCode;
            setInviteCode(code);
            navigator.clipboard.writeText(code)
                .then(() => alert(`Invite code "${code}" copied to clipboard!`))
                .catch(err => {
                    console.error('Failed to copy invite code automatically:', err);
                    alert(`Invite code: ${code} (Failed to copy automatically)`);
                });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to get invite code.');
            console.error("Get invite code error:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePromoteMember = async (memberIdToPromote, memberName) => {
        if (window.confirm(`Are you sure you want to promote ${memberName} to admin?`)) {
            setActionLoading(true);
            try {
                await api.post(`/groups/${groupId}/members/${memberIdToPromote}/promote`);
                alert(`${memberName} promoted successfully.`);
                fetchGroupData();
            } catch (err) {
                alert(err.response?.data?.error || `Failed to promote ${memberName}.`);
                console.error("Promote member error:", err);
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleDemoteAdmin = async (adminIdToDemote, adminName) => {
        if (window.confirm(`Are you sure you want to demote ${adminName} to member?`)) {
            setActionLoading(true);
            try {
                await api.post(`/groups/${groupId}/members/${adminIdToDemote}/demote`);
                alert(`${adminName} demoted successfully.`);
                fetchGroupData();
            } catch (err) {
                alert(err.response?.data?.error || `Failed to demote ${adminName}.`);
                console.error("Demote admin error:", err);
            } finally {
                setActionLoading(false);
            }
        }
    };


    if (loading) return <div className="container mx-auto p-4 flex justify-center mt-10"><Spinner /></div>;
    if (error) return <div className="container mx-auto p-4 text-red-500 bg-red-100 p-3 rounded text-center">{error}</div>;
    if (!group) return <div className="container mx-auto p-4 text-center text-gray-600">Group not found or could not be loaded.</div>;


    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Group Header */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{group.name}</h1>
                        <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded ${group.visibility === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {group.visibility}
                        </span>
                        {currentUserRole && (
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${currentUserRole === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                Your Role: {currentUserRole}
                            </span>
                        )}
                    </div>
                    <div className="flex-shrink-0 flex space-x-2 mt-2 sm:mt-0">
                        {isCurrentUserAdmin && (
                            <Link to={`/groups/${groupId}/edit`} className="button-link text-sm bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2">
                                Edit Group
                            </Link>
                        )}
                        {currentUserRole === 'member' && (
                            <button
                                onClick={handleLeaveGroup}
                                disabled={actionLoading}
                                className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-75"
                            >
                                {actionLoading ? 'Leaving...' : 'Leave Group'}
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-gray-700 mb-4">{group.description || 'No description.'}</p>
                {group.visibility === 'private' && isCurrentUserAdmin && (
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={handleGetInviteCode}
                            disabled={actionLoading}
                            className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-75"
                        >
                            {actionLoading ? '...' : (inviteCode && inviteCode !== 'Generate Code' ? 'Copy Code' : 'Get Invite Code')}
                        </button>
                        {inviteCode && inviteCode !== 'Generate Code' && <span className="text-sm font-mono bg-gray-100 border border-gray-300 px-2 py-1 rounded">{inviteCode}</span>}
                    </div>
                )}
            </div>

            {/* Events Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Upcoming Events</h2>
                    {isCurrentUserAdmin && (
                        <Link
                            to={`/groups/${groupId}/create-event`}
                            className="button-link bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
                        >
                            + Create Event
                        </Link>
                    )}
                </div>
                <EventList events={events} groupId={groupId} />
            </div>

            {/* Members Section */}
            <div>
                <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">Members ({members.length})</h2>
                <MemberList
                    members={members}
                    currentUserId={user?.userId}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    onRemoveMember={handleRemoveMember}
                    onPromoteMember={handlePromoteMember}
                    onDemoteAdmin={handleDemoteAdmin}
                    actionLoading={actionLoading}
                />
            </div>
        </div>
    );
};

export default GroupDetailPage;