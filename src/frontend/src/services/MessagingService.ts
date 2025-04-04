import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../declarations/messaging/messaging.did";

export interface Message {
    id: bigint;
    senderId: Principal;
    content: string;
    timestamp: bigint;
    isRead: boolean;
}

export interface Chat {
    otherUser: Principal;
    lastActivity: bigint;
}

export class MessagingService {
    private actor: any;
    private agent: HttpAgent;

    constructor(host?: string) {
        this.agent = new HttpAgent({ host: host || undefined });
        
        // Only fetch root key in development
        if (process.env.NODE_ENV !== "production") {
            this.agent.fetchRootKey().catch(err => {
                console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
                console.error(err);
            });
        }

        this.actor = Actor.createActor(idlFactory, {
            agent: this.agent,
            canisterId: process.env.MESSAGING_CANISTER_ID!,
        });
    }

    async sendMessage(recipient: Principal, content: string): Promise<Message> {
        try {
            const result = await this.actor.sendMessage(recipient, content);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async getMessages(otherUser: Principal): Promise<Message[]> {
        try {
            const result = await this.actor.getMessages(otherUser);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    async markMessagesAsRead(otherUser: Principal): Promise<void> {
        try {
            const result = await this.actor.markMessagesAsRead(otherUser);
            if ('err' in result) {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }

    async getChats(): Promise<Chat[]> {
        try {
            const result = await this.actor.getChats();
            if ('ok' in result) {
                return result.ok.map(([principal, lastActivity]) => ({
                    otherUser: principal,
                    lastActivity
                }));
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error getting chats:', error);
            throw error;
        }
    }
} 