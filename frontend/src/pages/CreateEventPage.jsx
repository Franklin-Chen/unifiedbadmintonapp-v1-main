import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';

const CreateEventPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [location, setLocation] = useState('');
    const [courtDetails, setCourtDetails] = useState('');
    const [suggestedCost, setSuggestedCost] = useState('');
    const [maxPlayers, setMaxPlayers] = useState('');
    const [skillLevel, setSkillLevel] = useState('');
    const [description, setDescription] = useState('');
    // ***** NEW STATE for Drop Deadline *****
    const [dropDeadlineHours, setDropDeadlineHours] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const getMinDateTime = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!name || !dateTime || !maxPlayers) {
            setError('Name, Date/Time, and Max Players are required.');
            setLoading(false);
            return;
        }
        if (parseInt(maxPlayers, 10) <= 0) {
            setError('Max Players must be a positive number.');
            setLoading(false);
            return;
        }
        if (suggestedCost && parseFloat(suggestedCost) < 0) {
            setError('Suggested Cost cannot be negative.');
            setLoading(false);
            return;
        }
        // ***** Validate Drop Deadline *****
        const deadline = dropDeadlineHours === '' ? null : parseInt(dropDeadlineHours, 10);
        if (deadline !== null && (isNaN(deadline) || deadline < 0)) {
            setError('Drop Deadline must be a non-negative number of hours (or leave blank).');
            setLoading(false);
            return;
        }


        const eventData = {
            name,
            dateTime,
            location,
            courtDetails,
            suggestedCost: suggestedCost ? parseFloat(suggestedCost) : null,
            maxPlayers: parseInt(maxPlayers, 10),
            skillLevel,
            description,
            dropDeadlineHours: deadline // Send parsed value or null
        };

        try {
            const response = await api.post(`/groups/${groupId}/events`, eventData);
            alert(`Event "${response.data.name}" created successfully!`);
            navigate(`/events/${response.data.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create event.');
            console.error("Create event error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            {/* Breadcrumbs */}
            <nav className="text-sm mb-4" aria-label="Breadcrumb">
                <ol className="list-none p-0 inline-flex">
                    <li className="flex items-center">
                        <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
                        <svg className="fill-current w-3 h-3 mx-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z" /></svg>
                    </li>
                    <li className="flex items-center">
                        <Link to={`/groups/${groupId}`} className="text-blue-600 hover:underline">Group Details</Link>
                        <svg className="fill-current w-3 h-3 mx-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z" /></svg>
                    </li>
                    <li className="text-gray-500">
                        Create Event
                    </li>
                </ol>
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Create New Event</h1>
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
                {/* Existing Form Fields */}
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="name">Event Name *</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full input" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="dateTime">Date & Time *</label>
                    <input type="datetime-local" id="dateTime" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required min={getMinDateTime()} className="w-full input" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="location">Location</label>
                    <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full input" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="courtDetails">Court Details <span className="text-gray-500 text-sm">(e.g., Courts 1-3)</span></label>
                    <input type="text" id="courtDetails" value={courtDetails} onChange={(e) => setCourtDetails(e.target.value)} className="w-full input" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="maxPlayers">Max Players *</label>
                    <input type="number" id="maxPlayers" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required min="1" className="w-full input" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="suggestedCost">Suggested Cost <span className="text-gray-500 text-sm">(per player, optional)</span></label>
                    <input type="number" id="suggestedCost" value={suggestedCost} onChange={(e) => setSuggestedCost(e.target.value)} step="0.01" min="0" className="w-full input" placeholder="e.g., 10.50" />
                </div>
                {/* ***** NEW Drop Deadline Field ***** */}
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="dropDeadlineHours">Drop Deadline <span className="text-gray-500 text-sm">(hours before event, optional)</span></label>
                    <input
                        type="number"
                        id="dropDeadlineHours"
                        value={dropDeadlineHours}
                        onChange={(e) => setDropDeadlineHours(e.target.value)}
                        min="0"
                        step="1"
                        className="w-full input"
                        placeholder="e.g., 6 (for 6 hours before)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for no deadline.</p>
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="skillLevel">Recommended Skill Level</label>
                    <input type="text" id="skillLevel" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="w-full input" placeholder="e.g., Intermediate, All Levels" />
                </div>
                <div>
                    <label className="block text-gray-700 mb-1 font-medium" htmlFor="description">Description</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="w-full input" placeholder="Optional: Add any extra details about the event..." />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out"
                >
                    {loading ? 'Creating Event...' : 'Create Event'}
                </button>
            </form>
        </div>
    );
};

export default CreateEventPage;