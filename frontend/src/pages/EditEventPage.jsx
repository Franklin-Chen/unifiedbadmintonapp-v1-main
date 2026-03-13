import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Spinner from '../components/Layout/Spinner';
import { useAuth } from '../contexts/AuthContext';

const EditEventPage = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        dateTime: '',
        location: '',
        courtDetails: '',
        suggestedCost: '',
        maxPlayers: '',
        skillLevel: '',
        description: '',
        dropDeadlineHours: '',
    });
    const [originalEvent, setOriginalEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');

    const fetchEventDetails = useCallback(async () => {
        if (!eventId || authLoading) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/events/${eventId}`);
            const eventData = response.data;
            setOriginalEvent(eventData);

            // Format date for datetime-local input
            const localDateTime = eventData.dateTime ? new Date(new Date(eventData.dateTime).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '';

            setFormData({
                name: eventData.name || '',
                dateTime: localDateTime,
                location: eventData.location || '',
                courtDetails: eventData.courtDetails || '',
                suggestedCost: eventData.suggestedCost !== null && eventData.suggestedCost !== undefined ? String(eventData.suggestedCost) : '',
                maxPlayers: eventData.maxPlayers !== null && eventData.maxPlayers !== undefined ? String(eventData.maxPlayers) : '',
                skillLevel: eventData.skillLevel || '',
                description: eventData.description || '',
                dropDeadlineHours: eventData.dropDeadlineHours !== null && eventData.dropDeadlineHours !== undefined ? String(eventData.dropDeadlineHours) : '',
            });
        } catch (err) {
            console.error("Failed to fetch event details:", err);
            setError(err.response?.data?.error || 'Failed to load event details. You may not have permission or the event does not exist.');
        } finally {
            setLoading(false);
        }
    }, [eventId, authLoading]);

    useEffect(() => {
        fetchEventDetails();
    }, [fetchEventDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitLoading(true);

        if (!formData.name.trim()) {
            setFormError('Event name cannot be empty.');
            setSubmitLoading(false);
            return;
        }
        if (!formData.dateTime) {
            setFormError('Event Date & Time cannot be empty.');
            setSubmitLoading(false);
            return;
        }

        const updatedFields = {};
        // Compare with originalEvent and add to updatedFields if changed
        // For dateTime, convert form's local time back to UTC or ISO string expected by backend
        const formDateTime = new Date(formData.dateTime).toISOString();
        if (formDateTime !== originalEvent.dateTime) {
            updatedFields.dateTime = formDateTime;
        }

        Object.keys(formData).forEach(key => {
            if (key === 'dateTime') return; // Handled above

            let formValue = formData[key];
            let originalValue = originalEvent[key];

            // Normalize empty strings to null for numeric/optional fields if backend expects null
            if (['suggestedCost', 'maxPlayers', 'dropDeadlineHours'].includes(key)) {
                formValue = formValue.trim() === '' ? null : Number(formValue);
                originalValue = originalValue === null || originalValue === undefined ? null : Number(originalValue);
            }
             if (key === 'description' && formValue.trim() === '' && (originalValue === null || originalValue === '')) {
                // Don't send empty description if it was already null/empty
            } else if (formValue !== originalValue) {
                 updatedFields[key] = formData[key].trim() === '' && !['name', 'location', 'skillLevel', 'courtDetails'].includes(key) ? null : formData[key];
            }
        });


        if (Object.keys(updatedFields).length === 0) {
            setFormError('No changes made to the event.');
            setSubmitLoading(false);
            return;
        }

        try {
            await api.put(`/events/${eventId}`, updatedFields);
            alert('Event updated successfully!');
            navigate(`/events/${eventId}`); // Navigate back to the event detail page
        } catch (err) {
            console.error("Failed to update event:", err);
            setFormError(err.response?.data?.error || 'Failed to update event. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (authLoading || loading) return <div className="container mx-auto p-4 flex justify-center mt-10"><Spinner /></div>;
    if (error) return <div className="container mx-auto p-4 text-red-500 bg-red-100 p-3 rounded text-center">{error}</div>;
    if (!originalEvent) return <div className="container mx-auto p-4 text-center text-gray-600">Event data could not be loaded.</div>;

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-2xl">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">Edit Event</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                        <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                        <input type="datetime-local" name="dateTime" id="dateTime" value={formData.dateTime} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label htmlFor="courtDetails" className="block text-sm font-medium text-gray-700 mb-1">Court Details</label>
                        <input type="text" name="courtDetails" id="courtDetails" value={formData.courtDetails} onChange={handleChange} className="input-field" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="suggestedCost" className="block text-sm font-medium text-gray-700 mb-1">Suggested Cost (e.g., 5.00)</label>
                            <input type="number" name="suggestedCost" id="suggestedCost" value={formData.suggestedCost} onChange={handleChange} step="0.01" min="0" className="input-field" placeholder="Leave blank if free" />
                        </div>
                        <div>
                            <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">Max Players</label>
                            <input type="number" name="maxPlayers" id="maxPlayers" value={formData.maxPlayers} onChange={handleChange} min="0" className="input-field" placeholder="Leave blank if no limit" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                        <input type="text" name="skillLevel" id="skillLevel" value={formData.skillLevel} onChange={handleChange} className="input-field" placeholder="e.g., Intermediate, All levels" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="4" className="input-field" />
                    </div>
                    <div>
                        <label htmlFor="dropDeadlineHours" className="block text-sm font-medium text-gray-700 mb-1">Drop Deadline (Hours before event)</label>
                        <input type="number" name="dropDeadlineHours" id="dropDeadlineHours" value={formData.dropDeadlineHours} onChange={handleChange} min="0" className="input-field" placeholder="e.g., 24 (for 24 hours prior)" />
                    </div>

                    {formError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{formError}</p>}

                    <div className="flex items-center justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate(`/events/${eventId}`)}
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

export default EditEventPage;