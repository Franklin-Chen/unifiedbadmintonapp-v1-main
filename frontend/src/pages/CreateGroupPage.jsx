import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // Use relative path without extension

const CreateGroupPage = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/groups', { name, description, visibility });
            alert(`Group "${response.data.name}" created successfully!`);
            // ***** FIX: Use response.data.id (matching backend) instead of groupId *****
            navigate(`/groups/${response.data.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create group.');
            console.error("Create group error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-lg">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Create New Group</h1>
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium" htmlFor="name">Group Name *</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium" htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional: What's this group about?"
                    />
                </div>
                <fieldset className="mb-6">
                    <legend className="block text-gray-700 mb-2 font-medium">Visibility *</legend>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="visibility"
                                value="private"
                                checked={visibility === 'private'}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-medium text-gray-800">Private</span>
                                <p className="text-sm text-gray-500">Only joinable via invite code.</p>
                            </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="visibility"
                                value="public"
                                checked={visibility === 'public'}
                                onChange={(e) => setVisibility(e.target.value)}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-medium text-gray-800">Public</span>
                                <p className="text-sm text-gray-500">Discoverable and open to join.</p>
                            </div>
                        </label>
                    </div>
                </fieldset>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out"
                >
                    {loading ? 'Creating...' : 'Create Group'}
                </button>
            </form>
        </div>
    );
};

export default CreateGroupPage;