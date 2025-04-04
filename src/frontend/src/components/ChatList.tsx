import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useMessaging } from '../contexts/MessagingContext';
import { useAuth } from '../contexts/AuthContext';

interface ChatListProps {
    onSelectChat: (recipientId: string) => void;
    selectedChat?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedChat }) => {
    const { chats, messages, loading, error } = useMessaging();
    const { principal } = useAuth();

    const getUnreadCount = (chatId: string) => {
        return (messages[chatId] || []).filter(
            (msg) => !msg.isRead && msg.senderId.toText() !== principal?.toText()
        ).length;
    };

    const formatLastActivity = (timestamp: bigint) => {
        return formatDistanceToNow(Number(timestamp) / 1000000, { addSuffix: true });
    };

    if (loading && chats.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-700 bg-red-100 rounded">
                {error}
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="p-4 text-gray-500 text-center">
                No active chats
            </div>
        );
    }

    return (
        <div className="divide-y">
            {chats.map((chat) => {
                const chatId = `${principal?.toText()}_${chat.otherUser.toText()}`
                    .split('_')
                    .sort()
                    .join('_');
                const unreadCount = getUnreadCount(chatId);

                return (
                    <button
                        key={chat.otherUser.toText()}
                        onClick={() => onSelectChat(chat.otherUser.toText())}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                            selectedChat === chat.otherUser.toText()
                                ? 'bg-blue-50'
                                : ''
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {chat.otherUser.toText().slice(0, 8)}...
                                </p>
                                <p className="text-sm text-gray-500">
                                    {formatLastActivity(chat.lastActivity)}
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-500 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}; 