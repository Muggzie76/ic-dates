import React, { useState, useEffect, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import { useMessaging } from '../contexts/MessagingContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ChatInterfaceProps {
    recipient: Principal;
    onClose?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ recipient, onClose }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { messages, sendMessage, loadMessages, markAsRead, loading, error } = useMessaging();
    const { principal } = useAuth();

    const chatId = `${principal?.toText()}_${recipient.toText()}`.split('_').sort().join('_');
    const chatMessages = messages[chatId] || [];

    useEffect(() => {
        loadMessages(recipient);
        const interval = setInterval(() => {
            loadMessages(recipient);
        }, 5000); // Poll for new messages every 5 seconds

        return () => clearInterval(interval);
    }, [recipient, loadMessages]);

    useEffect(() => {
        markAsRead(recipient);
    }, [chatMessages, markAsRead, recipient]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(recipient, newMessage.trim());
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const formatTimestamp = (timestamp: bigint) => {
        return formatDistanceToNow(Number(timestamp) / 1000000, { addSuffix: true });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Chat with {recipient.toText().slice(0, 8)}...</h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded">
                        {error}
                    </div>
                )}
                
                {chatMessages.map((message) => (
                    <div
                        key={message.id.toString()}
                        className={`flex flex-col ${
                            message.senderId.toText() === principal?.toText()
                                ? 'items-end'
                                : 'items-start'
                        }`}
                    >
                        <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                                message.senderId.toText() === principal?.toText()
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                            {message.content}
                        </div>
                        <span className="text-xs text-gray-500 mt-1">
                            {formatTimestamp(message.timestamp)}
                            {message.isRead && message.senderId.toText() === principal?.toText() && (
                                <span className="ml-2 text-blue-500">✓</span>
                            )}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 border-t">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !newMessage.trim()}
                        className={`px-4 py-2 rounded-lg bg-blue-500 text-white font-medium ${
                            loading || !newMessage.trim()
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-blue-600'
                        }`}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}; 