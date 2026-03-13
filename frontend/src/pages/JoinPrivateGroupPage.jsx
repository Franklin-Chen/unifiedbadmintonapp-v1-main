import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const JoinPrivateGroupPage = () => {
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/groups/join-private', { inviteCode });
            alert(`Successfully joined group "${response.data.groupId}"!`); // Improve feedback later
            navigate(`/groups/${response.data.groupId}`); // Redirect to the joined group's page
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to join group. Invalid code or already a member?');
            console.error("Join private group error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-md">
            <h1 className="text-3xl font-bold mb-6">Join Private Group</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="inviteCode">Invite Code</label>
                    <input
                        type="text"
                        id="inviteCode"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())} // Often codes are uppercase
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="Enter code..."
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                    {loading ? 'Joining...' : 'Join Group'}
                </button>
            </form>
        </div>
    );
};

export default JoinPrivateGroupPage;
//