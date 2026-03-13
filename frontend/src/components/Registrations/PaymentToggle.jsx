import React from 'react'; // Removed useState as parent manages loading state now

const PaymentToggle = ({ registrationId, initialPaidStatus, onToggle, loading }) => {

    const handleClick = async () => {
        // Parent now handles loading state via adminActionLoading prop
        // setLoading(true); // Remove local loading state management
        try {
            await onToggle(registrationId, initialPaidStatus);
        } catch (error) {
            console.error("Payment toggle failed in child, but likely handled by parent:", error);
        } finally {
            // setLoading(false); // Remove local loading state management
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading} // Use loading prop passed from parent
            className={`text-xs font-bold px-3 py-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-75 transition-colors w-20 text-center ${initialPaidStatus // Use initialPaidStatus for display logic
                    ? 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-400'
                }`}
            title={initialPaidStatus ? 'Click to mark as Unpaid' : 'Click to mark as Paid'}
        >
            {loading ? '...' : (initialPaidStatus ? 'Paid' : 'Mark Paid')}
        </button>
    );
};

export default PaymentToggle;