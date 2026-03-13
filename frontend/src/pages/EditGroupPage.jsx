import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Spinner from '../components/Layout/Spinner';

const EditGroupPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('public'); // Default or fetch current
    const [originalGroup, setOriginalGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');

    const fetchGroupDetails = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/groups/${groupId}`);
            const groupData = response.data;
            setOriginalGroup(groupData);
            setGroupName(groupData.name);
            setDescription(groupData.description || '');
            setVisibility(groupData.visibility);
        } catch (err) {
            console.error("Failed to fetch group details:", err);
            setError(err.response?.data?.error || 'Failed to load group details. You may not have permission or the group does not exist.');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchGroupDetails();
    }, [fetchGroupDetails]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitLoading(true);

        if (!groupName.trim()) {
            setFormError('Group name cannot be empty.');
            setSubmitLoading(false);
            return;
        }

        const updatedFields = {};
        if (groupName !== originalGroup.name) {
            updatedFields.name = groupName;
        }
        if (description !== (originalGroup.description || '')) {
            updatedFields.description = description;
        }
        if (visibility !== originalGroup.visibility) {
            updatedFields.visibility = visibility;
        }

        if (Object.keys(updatedFields).length === 0) {
            setFormError('No changes made to the group.');
            setSubmitLoading(false);
            return;
        }

        try {
            await api.put(`/groups/${groupId}`, updatedFields);
            alert('Group updated successfully!');
            navigate(`/groups/${groupId}`); // Navigate back to the group detail page
        } catch (err) {
            console.error("Failed to update group:", err);
            setFormError(err.response?.data?.error || 'Failed to update group. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <div className="container mx-auto p-4 flex justify-center mt-10"><Spinner /></div>;
    if (error) return <div className="container mx-auto p-4 text-red-500 bg-red-100 p-3 rounded text-center">{error}</div>;
    if (!originalGroup) return <div className="container mx-auto p-4 text-center text-gray-600">Group data could not be loaded.</div>;

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-lg">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Edit Group</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                            Group Name
                        </label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                                <input id="public" name="visibility" type="radio" value="public" checked={visibility === 'public'} onChange={(e) => setVisibility(e.target.value)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                <label htmlFor="public" className="ml-3 block text-sm font-medium text-gray-700">Public</label>
                            </div>
                            <div className="flex items-center">
                                <input id="private" name="visibility" type="radio" value="private" checked={visibility === 'private'} onChange={(e) => setVisibility(e.target.value)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                                <label htmlFor="private" className="ml-3 block text-sm font-medium text-gray-700">Private</label>
                            </div>
                        </div>
                    </div>

                    {formError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{formError}</p>}

                    <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate(`/groups/${groupId}`)} // Or navigate(-1)
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitLoading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-75"
                        >
                            {submitLoading ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditGroupPage;