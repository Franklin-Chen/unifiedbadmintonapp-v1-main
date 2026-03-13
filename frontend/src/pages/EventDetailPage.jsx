import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api'; // Assuming api is your configured axios instance or similar
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import RegistrationList from '../components/Registrations/RegistrationList';
import Waitlist from '../components/Registrations/Waitlist';
import Spinner from '../components/Layout/Spinner.jsx';

const EventDetailPage = () => {
    const { eventId } = useParams();
    // Get user AND loading state from AuthContext
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // For login redirect state
    const [event, setEvent] = useState(null);
    // Rename component loading state to avoid conflict
    const [eventLoading, setEventLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEventCreator, setIsEventCreator] = useState(false);
    const [currentUserGroupRole, setCurrentUserGroupRole] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isOnWaitlist, setIsOnWaitlist] = useState(false);
    const [userRegistrationId, setUserRegistrationId] = useState(null);
    const [userWaitlistEntryId, setUserWaitlistEntryId] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [adminActionLoading, setAdminActionLoading] = useState({});

    const isCurrentUserGroupAdmin = currentUserGroupRole === 'admin';

    // fetchEventData now depends on eventId and user object stability
    // It should only run when auth is done loading and eventId is present.
    const fetchEventData = useCallback(async () => {
        // Ensure eventId is present before fetching
        if (!eventId) {
            console.warn("LOG: EventDetailPage - fetchEventData: Event ID is missing.");
            setError("Event ID is missing.");
            setEventLoading(false); // Stop event loading if no ID
            return;
        }

        console.log(`LOG: EventDetailPage - fetchEventData: Running for eventId: ${eventId}`);
        setEventLoading(true); // Start loading event data
        // Reset states related to the specific event/user interaction
        setIsEventCreator(false);
        setCurrentUserGroupRole(null);
        setIsRegistered(false);
        setIsOnWaitlist(false);
        setUserRegistrationId(null);
        setUserWaitlistEntryId(null);
        setError('');

        try {
            console.log('LOG: EventDetailPage - fetchEventData: Fetching event details...');
            const response = await api.get(`/events/${eventId}`);
            console.log('LOG: EventDetailPage - fetchEventData: Raw API response received:', response);

            const eventData = response.data;
            console.log('LOG: EventDetailPage - fetchEventData: Data received from API:', eventData);

            if (!eventData) {
                console.error("LOG: EventDetailPage - fetchEventData: API returned empty data!");
                setError("Failed to load event data (empty response).");
                setEvent(null); // Ensure event is null on error
                setEventLoading(false);
                return;
            }

            setEvent(eventData);
            console.log('LOG: EventDetailPage - fetchEventData: event state update called.');

            // --- Process user-specific data ONLY if user is loaded and defined ---
            // NOTE: authLoading check is handled by the calling useEffect now
            if (user && typeof user.userId !== 'undefined') {
                console.log(`LOG: EventDetailPage - fetchEventData: Processing data for logged-in user: ${user.userId}`);

                // Check creator
                if (eventData.creator && eventData.creator.userId === user.userId) {
                    console.log('LOG: EventDetailPage - fetchEventData: User IS the event creator.');
                    setIsEventCreator(true);
                }

                // Check role
                setCurrentUserGroupRole(eventData.currentUserRole);
                console.log(`LOG: EventDetailPage - fetchEventData: Current user role set to: ${eventData.currentUserRole}`);

                // --- Registrations Check ---
                const registrationsArray = eventData.registrations;
                console.log('LOG: EventDetailPage - fetchEventData: Registrations array to search:', registrationsArray);
                console.log(`LOG: EventDetailPage - fetchEventData: Is registrationsArray an array? ${Array.isArray(registrationsArray)}`);

                if (Array.isArray(registrationsArray)) {
                    const registration = registrationsArray.find(reg => {
                        if (!reg) return false; // Skip null/undefined entries
                        // *** DEBUG LOG ***
                        console.log('LOG: EventDetailPage - find(registrations): Comparing values:', {
                            reg_userId: reg.userId, // Access directly
                            user_userId: user.userId
                        });
                        return reg.userId === user.userId; // Direct comparison
                    });
                    console.log('LOG: EventDetailPage - fetchEventData: Result of registrations find:', registration);

                    if (registration) {
                        console.log('LOG: EventDetailPage - fetchEventData: User IS registered.');
                        setIsRegistered(true);
                        setUserRegistrationId(registration.registrationId);
                    } else {
                        console.log('LOG: EventDetailPage - fetchEventData: User is NOT registered. Checking waitlist.');
                        // --- Waitlist Check ---
                        const waitlistArray = eventData.waitlist;
                        console.log('LOG: EventDetailPage - fetchEventData: Waitlist array to search:', waitlistArray);
                        console.log(`LOG: EventDetailPage - fetchEventData: Is waitlistArray an array? ${Array.isArray(waitlistArray)}`);

                        if (Array.isArray(waitlistArray)) {
                            const waitlistEntry = waitlistArray.find(wl => {
                                if (!wl) return false; // Skip null/undefined entries
                                // *** DEBUG LOG ***
                                console.log('LOG: EventDetailPage - find(waitlist): Comparing values:', {
                                    wl_userId: wl.userId, // Access directly
                                    user_userId: user.userId
                                });
                                return wl.userId === user.userId; // Direct comparison
                            });
                            console.log('LOG: EventDetailPage - fetchEventData: Result of waitlist find:', waitlistEntry);

                            if (waitlistEntry) {
                                console.log('LOG: EventDetailPage - fetchEventData: User IS on waitlist.');
                                setIsOnWaitlist(true);
                                setUserWaitlistEntryId(waitlistEntry.waitlistEntryId);
                            } else {
                                console.log('LOG: EventDetailPage - fetchEventData: User is NOT on waitlist.');
                            }
                        } else {
                            console.warn('LOG: EventDetailPage - fetchEventData: eventData.waitlist is not an array.');
                        }
                    }
                } else {
                    console.warn('LOG: EventDetailPage - fetchEventData: eventData.registrations is not an array.');
                }
            } else {
                // This block runs if user is null or userId is undefined
                console.log('LOG: EventDetailPage - fetchEventData: Skipping user-specific checks (User not fully loaded or not logged in).');
                if (!user) console.log('Reason: User context is null.');
                if (user && typeof user.userId === 'undefined') console.warn('Reason: User context available, but user.userId is undefined.');
                // Reset flags if no valid user
                setIsRegistered(false);
                setIsOnWaitlist(false);
            }

        } catch (err) {
            console.error("LOG: EventDetailPage - fetchEventData: CATCH block error:", err.response?.data || err.message, err);
            const errorMsg = err.response?.data?.error || `Failed to fetch event data.`;
            setError(errorMsg);
            if (err.response?.status === 403) {
                setError("You must be a member of this event's group to view it.");
            } else if (err.response?.status === 404) {
                setError("Event not found.");
            }
            setEvent(null); // Clear event data on error
        } finally {
            console.log("LOG: EventDetailPage - fetchEventData: Finally block reached, setting eventLoading to false.");
            setEventLoading(false); // Finish loading event data
        }
        // Include `user` in dependencies: if the user logs in/out while on the page, fetchEventData should re-run
    }, [eventId, user]);

    // This useEffect triggers fetchEventData ONLY when auth is not loading AND eventId is present.
    useEffect(() => {
        // Don't fetch if auth is still loading or if there's no eventId
        if (!authLoading && eventId) {
            console.log("LOG: EventDetailPage - useEffect: Auth loaded, eventId present. Calling fetchEventData.");
            fetchEventData();
        } else {
            console.log("LOG: EventDetailPage - useEffect: Skipping fetchEventData call.", { authLoading, eventId });
            // If auth is done loading but there's no eventId, stop the event loading spinner.
            if (!authLoading && !eventId) {
                setEventLoading(false);
                setError("No Event ID provided.");
            }
            // If auth is still loading, eventLoading should remain true (or be set true)
            if (authLoading) {
                setEventLoading(true);
            }
        }
    }, [authLoading, eventId, fetchEventData]); // Add authLoading and eventId as dependencies

    // --- Other handlers ---
    // These handlers should ideally check if 'user' exists before proceeding if they rely on user context
    const handleRegisterOrWaitlist = async () => {
        // Add check for user existence if needed for the API call implicitly
        if (!user) {
            alert("Please log in to register or join the waitlist.");
            // Consider redirecting to login: navigate('/login', { state: { from: location } });
            return;
        }
        console.log(`LOG: handleRegisterOrWaitlist called for eventId: ${eventId}`);
        if (actionLoading) return;
        setActionLoading(true);
        try {
            const response = await api.post(`/events/${eventId}/register`);
            if (response.data.status === 'registered') {
                alert("Successfully registered!");
            } else if (response.data.status === 'waitlisted') {
                alert(`Event full. Added to waitlist (Position: ${response.data.waitlistPosition})`);
            }
            // Refetch data only if auth isn't loading (to avoid potential race conditions)
            if (!authLoading) {
                await fetchEventData();
            }
        } catch (err) {
            console.error("LOG: handleRegisterOrWaitlist error:", err.response?.data || err.message, err);
            alert(err.response?.data?.error || 'Registration or waitlist join failed.');
        } finally {
            console.log("LOG: handleRegisterOrWaitlist finally block reached");
            setActionLoading(false);
        }
    };

    const handleCancelRegistration = async () => {
        if (!userRegistrationId) {
            alert("Could not find your registration ID.");
            return;
        }
        if (actionLoading) return;
        console.log(`LOG: handleCancelRegistration called for regId: ${userRegistrationId}`);
        if (window.confirm("Are you sure you want to cancel your registration?")) {
            setActionLoading(true);
            try {
                const response = await api.delete(`/registrations/cancel/${userRegistrationId}`);
                alert(response.data.message || "Registration cancelled.");
                if (!authLoading) {
                    await fetchEventData();
                }
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to cancel registration.');
                console.error("LOG: Cancel registration error:", err);
            } finally {
                console.log("LOG: handleCancelRegistration finally block reached");
                setActionLoading(false);
            }
        }
    };

    const handleLeaveWaitlist = async () => {
        if (!userWaitlistEntryId) {
            alert("Could not find your waitlist entry ID.");
            return;
        }
        if (actionLoading) return;
        console.log(`LOG: handleLeaveWaitlist called for waitlistId: ${userWaitlistEntryId}`);
        if (window.confirm("Are you sure you want to leave the waitlist?")) {
            setActionLoading(true);
            try {
                await api.delete(`/registrations/waitlist/${userWaitlistEntryId}`);
                alert("Successfully left the waitlist.");
                if (!authLoading) {
                    await fetchEventData();
                }
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to leave waitlist.');
                console.error("LOG: Leave waitlist error:", err);
            } finally {
                console.log("LOG: handleLeaveWaitlist finally block reached");
                setActionLoading(false);
            }
        }
    };


    const handleDeleteEvent = async () => {
        console.log(`LOG: handleDeleteEvent called for eventId: ${eventId}`);
        if (!eventId || adminActionLoading[`delete_${eventId}`]) return;
        if (window.confirm("Are you sure you want to delete this event? This cannot be undone.")) {
            setAdminActionLoading(prev => ({ ...prev, [`delete_${eventId}`]: true }));
            try {
                await api.delete(`/events/${eventId}`);
                alert("Event deleted successfully.");
                if (event?.groupId) {
                    navigate(`/groups/${event.groupId}`);
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete event.');
                console.error("LOG: Delete event error:", err);
                setAdminActionLoading(prev => ({ ...prev, [`delete_${eventId}`]: false }));
            }
        }
    };

    const handlePaymentStatusChange = useCallback(async (registrationId, currentStatus) => {
        console.log(`LOG: handlePaymentStatusChange called for regId: ${registrationId}, new status: ${!currentStatus}`);
        const actionKey = `pay_${registrationId}`;
        if (adminActionLoading[actionKey]) return;
        setAdminActionLoading(prev => ({ ...prev, [actionKey]: true }));
        try {
            await api.patch(`/registrations/${registrationId}/payment`, { paid: !currentStatus });
            setEvent(prevEvent => {
                if (!prevEvent) return null;
                return {
                    ...prevEvent,
                    registrations: prevEvent.registrations.map(reg =>
                        reg.registrationId === registrationId ? { ...reg, paid: !currentStatus } : reg
                    )
                };
            });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update payment status.');
            console.error("LOG: Update payment status error:", err);
        } finally {
            console.log("LOG: handlePaymentStatusChange finally block reached");
            setAdminActionLoading(prev => ({ ...prev, [actionKey]: false }));
        }
    }, [adminActionLoading]);

    const handleRemovePlayer = useCallback(async (registrationId, playerName) => {
        console.log(`LOG: handleRemovePlayer called for regId: ${registrationId}, player: ${playerName}`);
        const actionKey = `remove_${registrationId}`;
        if (adminActionLoading[actionKey]) return;
        if (window.confirm(`Are you sure you want to remove ${playerName} from this event?`)) {
            setAdminActionLoading(prev => ({ ...prev, [actionKey]: true }));
            try {
                const response = await api.delete(`/registrations/remove/${registrationId}`);
                alert(`${playerName} removed successfully. ${response.data.promotedUserId ? 'Next person promoted from waitlist.' : ''}`);
                // Refetch needed here to update lists accurately after promotion/removal
                if (!authLoading) { // Check authLoading before refetching
                    await fetchEventData();
                } else {
                    // Handle case where refetch is skipped - might need manual state update
                    console.warn("Auth still loading, fetchEventData skipped after remove player.");
                    // Potentially add optimistic update here if needed
                    setAdminActionLoading(prev => ({ ...prev, [actionKey]: false })); // Still need to stop loading
                }
            } catch (err) {
                alert(err.response?.data?.error || `Failed to remove ${playerName}.`);
                console.error("LOG: Remove player error:", err);
                setAdminActionLoading(prev => ({ ...prev, [actionKey]: false }));
            } finally {
                console.log("LOG: handleRemovePlayer finally block reached");
                // Loading state reset might be handled by refetch completion or catch block
            }
        }
    }, [adminActionLoading, authLoading, fetchEventData]); // Add authLoading dependency


    // --- Render Logic ---

    // Show main loading spinner if either auth or event data is loading
    if (authLoading || eventLoading) {
        console.log("LOG: EventDetailPage - Render: Showing loading spinner.", { authLoading, eventLoading });
        return <div className="container mx-auto p-4 flex justify-center mt-10"><Spinner /></div>;
    }

    // Display error if one occurred during event fetch
    if (error) {
        console.log("LOG: EventDetailPage - Render: Showing error message:", error);
        return <div className="container mx-auto p-4 text-red-500 bg-red-100 border border-red-300 p-3 rounded text-center">{error}</div>;
    }

    // If no error, but event is still null (e.g., fetch failed silently or invalid ID)
    if (!event) {
        console.log("LOG: EventDetailPage - Render: Event is null after loading, showing 'not found'.");
        return <div className="container mx-auto p-4 text-center text-gray-600">Event not found or could not be loaded. Please check the event ID or try again later.</div>;
    }

    // --- Event data is loaded and available ---
    console.log("LOG: EventDetailPage - Render: Rendering event details.");

    const isFull = typeof event.maxPlayers === 'number' && event.currentPlayers >= event.maxPlayers;
    // Ensure user object exists for these checks
    const canRegister = !!user && !isRegistered && !isOnWaitlist && !isFull;
    const canJoinWaitlist = !!user && !isRegistered && !isOnWaitlist && isFull;

    const formatDate = (dateString) => {
        if (!dateString) return 'Date TBC';
        try {
            const dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) {
                console.error("formatDate Error: Invalid Date for input:", dateString);
                return 'Invalid Date';
            }
            return dateObj.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
        } catch (e) {
            console.error("formatDate Error:", e);
            return 'Invalid Date';
        }
    };

    const formatDeadline = (dateTime, hoursBefore) => {
        if (hoursBefore === null || hoursBefore === undefined || !dateTime) return 'No deadline';
        try {
            const eventTime = new Date(dateTime);
            if (isNaN(eventTime.getTime())) return 'Invalid event date';
            const deadlineTime = new Date(eventTime.getTime() - hoursBefore * 60 * 60 * 1000);
            if (isNaN(deadlineTime.getTime())) return 'Invalid deadline calculation';
            return deadlineTime.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
        } catch (e) {
            console.error("formatDeadline Error:", e);
            return 'Invalid deadline';
        }
    };

    return (
        // --- JSX Structure ---
        // Add optional chaining `?.` for safety when accessing nested properties like event.creator?.name
        // Pass `user?.userId` safely to child components
        <div className="container mx-auto p-4 md:p-6">
            {/* Breadcrumbs */}
            <nav className="text-sm mb-4" aria-label="Breadcrumb">
                <ol className="list-none p-0 inline-flex">
                    <li className="flex items-center">
                        <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
                        <svg className="fill-current w-3 h-3 mx-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569 9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z" /></svg>
                    </li>
                    {event.groupId && (
                        <li className="flex items-center">
                            <Link to={`/groups/${event.groupId}`} className="text-blue-600 hover:underline">Group Details</Link>
                            <svg className="fill-current w-3 h-3 mx-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569 9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z" /></svg>
                        </li>
                    )}
                    <li className="text-gray-500">
                        Event Details
                    </li>
                </ol>
            </nav>

            {/* Event Header */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{event.name || 'Event Name Missing'}</h1>
                        {/* Use optional chaining for creator */}
                        <p className="text-sm text-gray-500 mt-1">Hosted by: {event.creator?.name || 'Unknown'}</p>
                    </div>
                    {/* Admin buttons */}
                    {isCurrentUserGroupAdmin && (
                        <div className="flex-shrink-0 flex space-x-2 mt-2 sm:mt-0">
                            <Link to={`/events/${eventId}/edit`} className="button-link text-sm bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2">
                                Edit Event
                            </Link>
                            <button
                                onClick={handleDeleteEvent}
                                disabled={adminActionLoading[`delete_${eventId}`]}
                                className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-75"
                            >
                                {adminActionLoading[`delete_${eventId}`] ? 'Deleting...' : 'Delete Event'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4 text-sm border-t border-b border-gray-200 py-4">
                    <div><strong className="font-semibold text-gray-700">Date & Time:</strong><br /> {formatDate(event.dateTime)}</div>
                    <div><strong className="font-semibold text-gray-700">Location:</strong><br /> {event.location || 'TBD'}</div>
                    <div><strong className="font-semibold text-gray-700">Courts:</strong><br /> {event.courtDetails || 'TBD'}</div>
                    <div><strong className="font-semibold text-gray-700">Skill Level:</strong><br /> {event.skillLevel || 'Any'}</div>
                    <div>
                        <strong className="font-semibold text-gray-700">Spots:</strong><br />
                        <span className={`${isFull ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
                            {typeof event.currentPlayers === 'number' ? event.currentPlayers : '?'} / {typeof event.maxPlayers === 'number' ? event.maxPlayers : '?'}
                        </span>
                        {isFull && typeof event.waitlistCount === 'number' && event.waitlistCount > 0 && (
                            <span className="text-xs text-orange-600 ml-2">({event.waitlistCount} on waitlist)</span>
                        )}
                    </div>
                    <div><strong className="font-semibold text-gray-700">Suggested Cost:</strong><br /> {event.suggestedCost ? `$${Number(event.suggestedCost).toFixed(2)}` : 'Free/TBD'}</div>
                    <div><strong className="font-semibold text-gray-700">Drop Deadline:</strong><br /> {formatDeadline(event.dateTime, event.dropDeadlineHours)}</div>
                </div>

                {/* Description */}
                {event.description && (
                    <div className="mb-4">
                        <strong className="font-semibold text-gray-700 text-sm">Description:</strong>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{event.description}</p>
                    </div>
                )}

                {/* Registration/Waitlist Actions - Render buttons based on user status */}
                <div className="mt-6 border-t pt-4">
                    {/* Show buttons only if user is logged in */}
                    {user && (
                        <>
                            {isRegistered && (
                                <button
                                    onClick={handleCancelRegistration}
                                    disabled={actionLoading}
                                    className="button-link bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out mr-2"
                                >
                                    {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
                                </button>
                            )}
                            {isOnWaitlist && (
                                <button
                                    onClick={handleLeaveWaitlist}
                                    disabled={actionLoading}
                                    className="button-link bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out mr-2"
                                >
                                    {actionLoading ? 'Leaving...' : 'Leave Waitlist'}
                                </button>
                            )}
                            {canRegister && (
                                <button
                                    onClick={handleRegisterOrWaitlist}
                                    disabled={actionLoading}
                                    className="button-link bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out mr-2"
                                >
                                    {actionLoading ? 'Registering...' : 'Register for Event'}
                                </button>
                            )}
                            {canJoinWaitlist && (
                                <button
                                    onClick={handleRegisterOrWaitlist}
                                    disabled={actionLoading}
                                    className="button-link bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-75 transition duration-150 ease-in-out"
                                >
                                    {actionLoading ? 'Joining...' : 'Join Waitlist'}
                                </button>
                            )}
                        </>
                    )}
                    {/* Show login prompt if not logged in and spots/waitlist available */}
                    {!user && (!isFull || (typeof event.waitlistCount === 'number' && event.waitlistCount >= 0)) && ( // Simplified condition
                        <p className="text-gray-600">Please <Link to="/login" state={{ from: location }} className="text-blue-600 hover:underline">log in</Link> to register or join the waitlist.</p>
                    )}
                    {/* Show 'Event is full' message */}
                    {isFull && !canJoinWaitlist && (!user || (!isRegistered && !isOnWaitlist)) && (
                        <p className="text-red-600 font-semibold bg-red-50 p-3 rounded border border-red-200">Event is full.</p>
                    )}
                </div>
            </div>

            {/* Registrations List Section */}
            <div className="mb-8">
                <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">Registered Players ({typeof event.currentPlayers === 'number' ? event.currentPlayers : '?'})</h2>
                <RegistrationList
                    registrations={event.registrations || []}
                    isGroupAdmin={isCurrentUserGroupAdmin}
                    // Pass userId safely using optional chaining
                    currentUserId={user?.userId}
                    onPaymentToggle={handlePaymentStatusChange}
                    onRemovePlayer={handleRemovePlayer}
                    adminActionLoading={adminActionLoading}
                />
            </div>

            {/* Waitlist Section */}
            <div>
                <h2 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">Waitlist ({typeof event.waitlistCount === 'number' ? event.waitlistCount : '?'})</h2>
                <Waitlist
                    waitlistEntries={event.waitlist || []}
                    isGroupAdmin={isCurrentUserGroupAdmin}
                />
            </div>
        </div>
    );
};

export default EventDetailPage;
