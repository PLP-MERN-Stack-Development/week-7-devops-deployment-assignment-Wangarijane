import { useEffect, useState } from 'react';
import { useSocket } from '../socket/socket';
import ChatMessages from '../components/ChatMessages';

function Chat() {
  const username = localStorage.getItem('chat_username');
  const {
    socket,
    isConnected,
    connect,
    disconnect,
    messages,
    sendMessage,
    sendPrivateMessage,
    users,
    typingUsers,
    setTyping,
    addReaction,
    loadOlderMessages, // ✅
  } = useSocket();

  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [room] = useState(localStorage.getItem('chat_room') || 'General');

  useEffect(() => {
    if (username) connect(username);
    return () => disconnect();
  }, [username]);

  const handleSend = () => {
    if (message.trim()) {
      if (selectedUser) {
        sendPrivateMessage(selectedUser.id, message);
      } else {
        sendMessage(message);
      }
      setMessage('');
      setTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleReact = (messageId, emoji) => {
    addReaction(messageId, emoji, username);
  };

  return (
    <div className="chat-page">
      <h2>Welcome, {username}</h2>
      {!isConnected && (
        <div style={{ color: 'red', fontStyle: 'italic' }}>Reconnecting...</div>
      )}

      <div>
        <h4>Online Users ({users.length})</h4>
        <ul>
          {users
            .filter((user) => user.username !== username)
            .map((user) => (
              <li key={user.id}>
                {user.username}
                <button
                  onClick={() =>
                    setSelectedUser(
                      selectedUser?.id === user.id ? null : user
                    )
                  }
                >
                  {selectedUser?.id === user.id ? 'Cancel' : 'Private Chat'}
                </button>
              </li>
            ))}
        </ul>
        {selectedUser && (
          <div style={{ color: 'purple' }}>
            🔒 Chatting privately with {selectedUser.username}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '1rem', padding: '5px', width: '100%' }}
      />

      {/* Messages */}
      <ChatMessages
        messages={messages}
        currentUserId={socket.id}
        handleReact={handleReact}
        searchTerm={searchTerm}
        loadOlderMessages={loadOlderMessages}
      />

      {/* Typing Indicator */}
      <div style={{ fontStyle: 'italic', color: 'gray' }}>
        {typingUsers.length > 0 &&
          `${typingUsers.join(', ')} ${
            typingUsers.length > 1 ? 'are' : 'is'
          } typing...`}
      </div>

      {/* Input */}
      <div style={{ marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default Chat;