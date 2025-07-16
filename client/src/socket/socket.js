import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const useSocket = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const socketRef = useRef(socket);

  const connect = (username) => {
    const room = localStorage.getItem('chat_room') || 'General';
    localStorage.setItem('chat_username', username);
    localStorage.setItem('chat_room', room);

    socketRef.current.auth = { username, room };
    socketRef.current.connect();
    socketRef.current.emit('user_join', { username, room });
  };

  const disconnect = () => {
    socketRef.current.disconnect();
  };

  const sendMessage = (message) => {
    socketRef.current.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socketRef.current.emit('private_message', { to, message });
  };

  const setTyping = (isTyping) => {
    socketRef.current.emit('typing', isTyping);
  };

  const addReaction = (messageId, emoji, username) => {
    socketRef.current.emit('add_reaction', { messageId, emoji, username });
  };

  const markMessageAsRead = (messageId, userId) => {
    socketRef.current.emit('read_message', { messageId, userId });
  };

  const loadOlderMessages = () => {
    // 🔁 Placeholder for real server-side pagination
    console.log('Load older messages...');
  };

  useEffect(() => {
    const s = socketRef.current;

    s.on('connect', () => {
      setIsConnected(true);
      const username = localStorage.getItem('chat_username');
      const room = localStorage.getItem('chat_room') || 'General';
      if (username) {
        s.emit('user_join', { username, room });
      }
    });

    s.on('disconnect', () => setIsConnected(false));
    s.on('user_list', (data) => setUsers(data));

    s.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    s.on('private_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    s.on('typing_users', (data) => setTypingUsers(data));

    s.on('message_reaction', ({ messageId, emoji, username }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), { emoji, username }],
              }
            : msg
        )
      );
    });

    s.on('message_read', ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                readBy: msg.readBy?.includes(userId)
                  ? msg.readBy
                  : [...(msg.readBy || []), userId],
              }
            : msg
        )
      );
    });

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('user_list');
      s.off('receive_message');
      s.off('private_message');
      s.off('typing_users');
      s.off('message_reaction');
      s.off('message_read');
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    addReaction,
    markMessageAsRead,
    loadOlderMessages, // ✅ Add this
    messages,
    users,
    typingUsers,
  };
};