import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor Messaging {
    // Types
    type MessageId = Nat;
    type ChatId = Text;
    
    type Message = {
        id: MessageId;
        senderId: Principal;
        content: Text;
        timestamp: Int;
        isRead: Bool;
    };

    type StableChat = {
        id: ChatId;
        participants: [Principal];
        messages: [Message];
        lastActivity: Int;
    };

    type Chat = {
        id: ChatId;
        participants: [Principal];
        messages: Buffer.Buffer<Message>;
        lastActivity: Int;
    };

    // Stable storage
    private stable var messageCounter: Nat = 0;
    private stable var chatEntries: [(ChatId, StableChat)] = [];
    
    // Runtime storage
    private var chats = HashMap.HashMap<ChatId, Chat>(10, Text.equal, Text.hash);

    // System functions
    system func preupgrade() {
        chatEntries := Iter.toArray(
            Iter.map<(ChatId, Chat), (ChatId, StableChat)>(
                chats.entries(),
                func((id, chat)) : (ChatId, StableChat) {
                    (id, {
                        id = chat.id;
                        participants = chat.participants;
                        messages = Buffer.toArray(chat.messages);
                        lastActivity = chat.lastActivity;
                    })
                }
            )
        );
    };

    system func postupgrade() {
        for ((id, stableChat) in chatEntries.vals()) {
            let messageBuffer = Buffer.Buffer<Message>(stableChat.messages.size());
            for (msg in stableChat.messages.vals()) {
                messageBuffer.add(msg);
            };
            
            let chat : Chat = {
                id = stableChat.id;
                participants = stableChat.participants;
                messages = messageBuffer;
                lastActivity = stableChat.lastActivity;
            };
            chats.put(id, chat);
        };
        chatEntries := [];
    };

    // Helper functions
    private func generateChatId(user1: Principal, user2: Principal) : ChatId {
        let sorted = if (Principal.toText(user1) < Principal.toText(user2)) {
            [user1, user2]
        } else {
            [user2, user1]
        };
        Principal.toText(sorted[0]) # "_" # Principal.toText(sorted[1])
    };

    // Public functions
    public shared(msg) func sendMessage(recipient: Principal, content: Text) : async Result.Result<Message, Text> {
        let chatId = generateChatId(msg.caller, recipient);
        
        let newMessage = {
            id = messageCounter;
            senderId = msg.caller;
            content;
            timestamp = Time.now();
            isRead = false;
        };
        
        messageCounter += 1;

        switch (chats.get(chatId)) {
            case (null) {
                let messageBuffer = Buffer.Buffer<Message>(10);
                messageBuffer.add(newMessage);
                
                let newChat = {
                    id = chatId;
                    participants = [msg.caller, recipient];
                    messages = messageBuffer;
                    lastActivity = Time.now();
                };
                chats.put(chatId, newChat);
            };
            case (?existingChat) {
                existingChat.messages.add(newMessage);
                let updatedChat = {
                    id = existingChat.id;
                    participants = existingChat.participants;
                    messages = existingChat.messages;
                    lastActivity = Time.now();
                };
                chats.put(chatId, updatedChat);
            };
        };

        #ok(newMessage)
    };

    public shared(msg) func getMessages(otherUser: Principal) : async Result.Result<[Message], Text> {
        let chatId = generateChatId(msg.caller, otherUser);
        
        switch (chats.get(chatId)) {
            case (null) { #ok([]) };
            case (?chat) {
                if (not Array.contains<Principal>(chat.participants, msg.caller, Principal.equal)) {
                    #err("Unauthorized access to chat")
                } else {
                    #ok(Buffer.toArray(chat.messages))
                }
            };
        }
    };

    public shared(msg) func markMessagesAsRead(otherUser: Principal) : async Result.Result<(), Text> {
        let chatId = generateChatId(msg.caller, otherUser);
        
        switch (chats.get(chatId)) {
            case (null) { #err("Chat not found") };
            case (?chat) {
                if (not Array.contains<Principal>(chat.participants, msg.caller, Principal.equal)) {
                    #err("Unauthorized access to chat")
                } else {
                    let updatedMessages = Buffer.Buffer<Message>(chat.messages.size());
                    for (message in chat.messages.vals()) {
                        if (message.senderId != msg.caller and not message.isRead) {
                            updatedMessages.add({
                                id = message.id;
                                senderId = message.senderId;
                                content = message.content;
                                timestamp = message.timestamp;
                                isRead = true;
                            });
                        } else {
                            updatedMessages.add(message);
                        };
                    };
                    
                    let updatedChat = {
                        id = chat.id;
                        participants = chat.participants;
                        messages = updatedMessages;
                        lastActivity = chat.lastActivity;
                    };
                    chats.put(chatId, updatedChat);
                    #ok(())
                }
            };
        }
    };

    public shared(msg) func getChats() : async Result.Result<[(Principal, Int)], Text> {
        let userChats = Buffer.Buffer<(Principal, Int)>(0);
        
        for ((_, chat) in chats.entries()) {
            if (Array.contains<Principal>(chat.participants, msg.caller, Principal.equal)) {
                let otherUser = if (Principal.equal(chat.participants[0], msg.caller)) {
                    chat.participants[1]
                } else {
                    chat.participants[0]
                };
                userChats.add((otherUser, chat.lastActivity));
            };
        };
        
        #ok(Buffer.toArray(userChats))
    };
} 