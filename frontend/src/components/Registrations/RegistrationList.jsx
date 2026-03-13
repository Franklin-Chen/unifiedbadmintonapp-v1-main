import React from 'react';
import PaymentToggle from './PaymentToggle'; // Assuming this component exists and works

// Functional component to display the list of registered players
const RegistrationList = ({
    registrations,        // Array of registration objects
    isGroupAdmin,         // Boolean indicating if the current user is a group admin
    currentUserId,        // ID of the currently logged-in user
    onPaymentToggle,      // Function to call when payment status is toggled
    onRemovePlayer,       // Function to call when removing a player
    adminActionLoading    // Object tracking loading state for admin actions
}) => {

    // Display a message if there are no registrations
    if (!registrations || registrations.length === 0) {
        return <p className="text-gray-600 bg-gray-50 p-4 rounded-md text-center">No one has registered yet.</p>;
    }

    // Render the list of registrations
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <ul className="divide-y divide-gray-200">
                {/* Map over the registrations array to create list items */}
                {registrations.map((reg, index) => {
                    // Determine loading states for specific actions on this registration
                    const isLoadingPayment = adminActionLoading?.[`pay_${reg.registrationId}`] || false;
                    const isLoadingRemove = adminActionLoading?.[`remove_${reg.registrationId}`] || false;

                    // ***** FIX 1: Access userId directly from reg object *****
                    // Check if the current registration belongs to the logged-in user
                    const isSelf = reg.userId === currentUserId;

                    return (
                        <li key={reg.registrationId} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            {/* Left Side: Player Name */}
                            <div className="flex items-center flex-grow">
                                <span className="text-gray-500 text-sm w-6 mr-2 text-right">{index + 1}.</span>
                                {/* ***** FIX 2: Access name directly from reg object ***** */}
                                <span className="font-medium text-gray-800">{reg.name}</span>
                                {/* Optional: Add Host tag if needed (would require passing event creator ID) */}
                            </div>

                            {/* Right Side: Actions */}
                            <div className="sm:ml-auto flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                                {/* Show admin controls if the current user is a group admin */}
                                {isGroupAdmin ? (
                                    <>
                                        {/* Payment toggle component */}
                                        <PaymentToggle
                                            registrationId={reg.registrationId}
                                            initialPaidStatus={reg.paid}
                                            onToggle={onPaymentToggle}
                                            loading={isLoadingPayment}
                                        />
                                        {/* Show Remove button only if admin AND it's not their own registration */}
                                        {!isSelf && (
                                            <button
                                                // ***** FIX 3: Access name directly from reg object *****
                                                onClick={() => onRemovePlayer(reg.registrationId, reg.name)}
                                                disabled={isLoadingRemove || isLoadingPayment} // Disable if either action is loading
                                                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-2 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-75"
                                                title="Remove player from event"
                                            >
                                                {isLoadingRemove ? '...' : 'Remove'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    // View for non-admins: Show payment status
                                    <span className={`text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full ${reg.paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {reg.paid ? 'PAID' : 'UNPAID'}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default RegistrationList;
