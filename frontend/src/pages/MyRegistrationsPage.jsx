import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import Spinner from '../components/Layout/Spinner';

const MyRegistrationsPage = () => {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyStatus = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/registrations/my-status');
                // console.log("MyRegistrationsPage received statuses:", response.data);
                // Sort using event.dateTime (camelCase) from API response
                response.data.sort((a, b) => new Date(a.event.dateTime) - new Date(b.event.dateTime));
                setStatuses(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch your registrations and waitlist statuses.');
                console.error("Fetch my status error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyStatus();
    }, []);

    const formatDate = (dateString) => {
        // console.log("MyRegistrationsPage formatting date input:", dateString);
        if (!dateString) return 'Date TBC';
        try {
            const dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) {
                console.error("MyRegistrationsPage: Result of new Date() is Invalid Date for input:", dateString);
                return 'Invalid Date';
            }
            return dateObj.toLocaleString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        } catch (e) {
            console.error("MyRegistrationsPage: Date formatting error:", e);
            return 'Invalid Date';
        }
    };

    const handleCancelOrLeave = async (item) => {
        let endpoint = '';
        let confirmMessage = '';

        if (item.status === 'registered') {
            endpoint = `/registrations/cancel/${item.registrationId}`;
            confirmMessage = "Are you sure you want to cancel your registration for this event?";
        } else if (item.status === 'waitlisted') {
            endpoint = `/registrations/waitlist/${item.waitlistEntryId}`;
            confirmMessage = "Are you sure you want to leave the waitlist for this event?";
        } else {
            return;
        }

        if (window.confirm(confirmMessage)) {
            try {
                const response = await api.delete(endpoint);
                alert(response.data.message || "Action successful.");
                setStatuses(prev => prev.filter(s =>
                    s.status === 'registered' ? s.registrationId !== item.registrationId : s.waitlistEntryId !== item.waitlistEntryId
                ));
            } catch (err) {
                alert(err.response?.data?.error || 'Action failed.');
                console.error("Cancel/Leave error:", err);
            }
        }
    };


    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">My Registrations & Waitlists</h1>

            {loading && <div className="flex justify-center mt-10"><Spinner /></div>}
            {error && <p className="text-red-500 bg-red-100 p-3 rounded text-center">{error}</p>}

            {!loading && !error && (
                <>
                    {statuses.length === 0 ? (
                        <p className="text-center text-gray-600 bg-white p-6 rounded shadow">You aren't registered or waitlisted for any upcoming events.</p>
                    ) : (
                        <div className="space-y-4">
                            {statuses.map((item) => {
                                // console.log("MyRegistrationsPage mapping item:", item);
                                // ***** FIX: Use item.event.dateTime (camelCase) from API response *****
                                const formattedDate = formatDate(item.event.dateTime);
                                // Check if event is full
                                const isEventFull = item.event.currentPlayers >= item.event.maxPlayers;

                                return (
                                    <div key={item.registrationId || item.waitlistEntryId} className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                        {/* Event Info */}
                                        <div className="flex-grow">
                                            <h2 className="text-lg font-semibold text-gray-800">
                                                <Link to={`/events/${item.event.eventId}`} className="hover:underline hover:text-blue-600">{item.event.name}</Link>
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                Group: <Link to={`/groups/${item.event.groupId}`} className="hover:underline hover:text-blue-600">{item.event.groupName}</Link>
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">{formattedDate}</p>
                                            {/* Display Capacity Info */}
                                            <p className={`text-xs mt-1 font-medium ${isEventFull ? 'text-red-600' : 'text-gray-500'}`}>
                                                Spots: {item.event.currentPlayers} / {item.event.maxPlayers}
                                                {isEventFull && item.event.waitlistCount > 0 && (
                                                    <span className="text-orange-600 ml-1">({item.event.waitlistCount} waitlisted)</span>
                                                )}
                                            </p>
                                        </div>
                                        {/* Status and Action */}
                                        <div className="flex-shrink-0 mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                            {item.status === 'registered' && (
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${item.paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {item.paid ? 'PAID' : 'UNPAID'}
                                                </span>
                                            )}
                                            {item.status === 'waitlisted' && (
                                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                                    Waitlisted (#{item.waitlistPosition})
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleCancelOrLeave(item)}
                                                className="text-xs text-red-600 hover:text-red-800 hover:underline focus:outline-none"
                                            >
                                                {item.status === 'registered' ? 'Cancel Registration' : 'Leave Waitlist'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyRegistrationsPage;