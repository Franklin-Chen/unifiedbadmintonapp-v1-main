import React from 'react';
import { Link } from 'react-router-dom';

const EventList = ({ events, groupId }) => {
    if (!events || events.length === 0) {
        return <p className="text-gray-600 bg-gray-50 p-4 rounded-md text-center">No upcoming events found for this group.</p>;
    }

    const formatDate = (dateString) => {
        // Apply the same robust formatting logic
        if (!dateString) return 'Date TBC';
        try {
            const dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) { // Check for Invalid Date
                console.error("EventList: Result of new Date() is Invalid Date for input:", dateString);
                return 'Invalid Date';
            }
            return dateObj.toLocaleString(undefined, {
                weekday: 'short', // e.g., Wed
                month: 'short', // e.g., Sep
                day: 'numeric', // e.g., 24
                hour: 'numeric', // e.g., 7 PM
                minute: '2-digit', // e.g., 00
                hour12: true
            });
        } catch (e) {
            console.error("EventList: Date formatting error:", e);
            return 'Invalid Date';
        }
    };

    // console.log("EventList received events prop:", events); // Keep for debugging if needed

    return (
        <div className="space-y-4">
            {events.map((event) => {
                const formattedDate = formatDate(event.dateTime); // Use correct property name
                // Determine if full
                const isFull = event.currentPlayers >= event.maxPlayers;

                return (
                    <div key={event.eventId} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-150">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                            {/* Left side: Event Info */}
                            <div className="flex-grow">
                                <h3 className="text-lg font-semibold mb-1 text-gray-800">
                                    <Link to={`/events/${event.eventId}`} className="hover:text-blue-600 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-0.5 py-0.5 -ml-0.5">
                                        {event.name}
                                    </Link>
                                </h3>
                                <p className="text-sm text-gray-600">{formattedDate}</p> {/* Display the formatted date */}
                                <p className="text-sm text-gray-500">{event.location || 'Location TBD'}</p>
                            </div>
                            {/* Right side: Spots & Cost & Waitlist */}
                            <div className="text-left sm:text-right flex-shrink-0">
                                {/* Updated Spots Display */}
                                <p className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-gray-800'}`}>
                                    {event.currentPlayers ?? '?'} / {event.maxPlayers} spots
                                </p>
                                {/* Show waitlist count ONLY if full */}
                                {isFull && event.waitlistCount > 0 && (
                                    <p className="text-xs text-orange-600">({event.waitlistCount} on waitlist)</p>
                                )}
                                <p className="text-sm text-gray-500 mt-1">
                                    {event.suggestedCost ? `$${Number(event.suggestedCost).toFixed(2)}` : 'Free/TBD'}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default EventList;