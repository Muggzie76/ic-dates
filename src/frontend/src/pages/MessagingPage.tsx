import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { ChatList } from '../components/ChatList';
import { ChatInterface } from '../components/ChatInterface';
import { useMessaging } from '../contexts/MessagingContext';

export const MessagingPage: React.FC = () => {
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const { loading } = useMessaging();

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar with chat list */}
            <div className="w-1/3 border-r bg-white">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-semibold">Messages</h1>
                </div>
                <ChatList
                    onSelectChat={(recipientId) => setSelectedChat(recipientId)}
                    selectedChat={selectedChat || undefined}
                />
            </div>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col">
                {selectedChat ? (
                    <ChatInterface
                        recipient={Principal.fromText(selectedChat)}
                        onClose={() => setSelectedChat(null)}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        {loading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        ) : (
                            <p>Select a chat to start messaging</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}; 