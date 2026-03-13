import React from 'react';

const MemberList = ({
    members,
    currentUserId,
    isCurrentUserAdmin,
    onRemoveMember,
    onPromoteMember,
    onDemoteAdmin,
    actionLoading
}) => {

    if (!members || members.length === 0) {
        return <p className="text-gray-600 bg-gray-50 p-4 rounded-md text-center">No members found (this shouldn't happen!).</p>;
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <ul className="divide-y divide-gray-200">
                {members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const canAdminActions = isCurrentUserAdmin && !isSelf; // Admin can act on others
                    const canPromote = canAdminActions && member.role === 'member';
                    const canDemote = canAdminActions && member.role === 'admin'; // Add check to prevent demoting creator if needed
                    const canRemove = canAdminActions; // Add check to prevent removing creator if needed

                    return (
                        <li key={member.userId} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            {/* Member Info */}
                            <div>
                                <span className="font-medium text-gray-800">{member.name} {isSelf ? '(You)' : ''}</span>
                                <span className={`ml-2 text-xs font-medium px-2.5 py-0.5 rounded ${member.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {member.role}
                                </span>
                            </div>
                            {/* Admin Actions */}
                            <div className="sm:ml-auto flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                                {canPromote && (
                                    <button
                                        onClick={() => onPromoteMember(member.userId, member.name)}
                                        disabled={actionLoading}
                                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-medium py-1 px-2 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-green-300 disabled:opacity-75"
                                        title="Promote to Admin"
                                    >
                                        Promote
                                    </button>
                                )}
                                {canDemote && (
                                    <button
                                        onClick={() => onDemoteAdmin(member.userId, member.name)}
                                        disabled={actionLoading}
                                        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-1 px-2 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-yellow-300 disabled:opacity-75"
                                        title="Demote to Member"
                                    >
                                        Demote
                                    </button>
                                )}
                                {canRemove && (
                                    <button
                                        onClick={() => onRemoveMember(member.userId, member.name)}
                                        disabled={actionLoading}
                                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-2 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-75"
                                        title="Remove from Group"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default MemberList;