import React from 'react';

// Functional component to display the waitlist entries
const Waitlist = ({ waitlistEntries, isGroupAdmin }) => { // isGroupAdmin prop is accepted but not used yet

    // Display a message if the waitlist is empty
    if (!waitlistEntries || waitlistEntries.length === 0) {
        return <p className="text-gray-600 bg-gray-50 p-4 rounded-md text-center">Waitlist is empty.</p>;
    }

    // Render the list of waitlist entries
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <ul className="divide-y divide-gray-200">
                {/* Map over the waitlist entries to create list items */}
                {waitlistEntries.map((entry, index) => (
                    <li key={entry.waitlistEntryId} className="py-3 flex justify-between items-center">
                        <div className="flex items-center">
                            {/* Display the position number */}
                            <span className="text-orange-600 font-semibold text-sm w-6 mr-2 text-right">{index + 1}.</span>
                            {/* ***** FIX: Access name directly from entry object ***** */}
                            <span className="font-medium text-gray-800">{entry.name}</span>
                        </div>
                        {/* Placeholder for future actions like admin remove from waitlist */}
                        {/* {isGroupAdmin && (
                            <button className="text-xs text-red-500 hover:underline">Remove</button>
                        )} */}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Waitlist;
