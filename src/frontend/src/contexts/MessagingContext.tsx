import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { MessagingService, Message, Chat } from '../services/MessagingService';
import { useAuth } from './AuthContext';

interface MessagingContextType {
    messages: { [chatId: string]: Message[] };
    chats: Chat[];
    sendMessage: (recipient: Principal, content: string) => Promise<void>;
    loadMessages: (otherUser: Principal) => Promise<void>;
    markAsRead: (otherUser: Principal) => Promise<void>;
    loadChats: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
    const context = useContext(MessagingContext);
    if (!context) {
        throw new Error('useMessaging must be used within a MessagingProvider');
    }
    return context;
};

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();

    const messagingService = new MessagingService();

    const generateChatId = (user1: Principal, user2: Principal): string => {
        const sorted = [user1.toText(), user2.toText()].sort();
        return `${sorted[0]}_${sorted[1]}`;
    };

    const sendMessage = useCallback(async (recipient: Principal, content: string) => {
        try {
            setLoading(true);
            setError(null);
            const newMessage = await messagingService.sendMessage(recipient, content);
            const chatId = generateChatId(newMessage.senderId, recipient);
            
            setMessages(prev => ({
                ...prev,
                [chatId]: [...(prev[chatId] || []), newMessage]
            }));

            // Refresh chat list to update last activity
            await loadChats();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (otherUser: Principal) => {
        try {
            setLoading(true);
            setError(null);
            const chatMessages = await messagingService.getMessages(otherUser);
            const chatId = generateChatId(otherUser, Principal.fromText(process.env.CANISTER_ID_MESSAGING!));
            
            setMessages(prev => ({
                ...prev,
                [chatId]: chatMessages
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (otherUser: Principal) => {
        try {
            await messagingService.markMessagesAsRead(otherUser);
            const chatId = generateChatId(otherUser, Principal.fromText(process.env.CANISTER_ID_MESSAGING!));
            
            setMessages(prev => ({
                ...prev,
                [chatId]: prev[chatId]?.map(msg => ({
                    ...msg,
                    isRead: true
                })) || []
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
        }
    }, []);

    const loadChats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const userChats = await messagingService.getChats();
            setChats(userChats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load chats');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadChats();
        }
    }, [isAuthenticated, loadChats]);

    const value = {
        messages,
        chats,
        sendMessage,
        loadMessages,
        markAsRead,
        loadChats,
        loading,
        error
    };

    return (
        <MessagingContext.Provider value={value}>
            {children}
        </MessagingContext.Provider>
    );
}; 