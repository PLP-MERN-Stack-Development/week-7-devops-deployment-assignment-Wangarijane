import { useEffect, useRef } from 'react';
import { format } from 'date-fns';

function ChatMessages({ messages, currentUserId, handleReact, loadOlderMessages, searchTerm }) {
  const containerRef = useRef();

  const handleScroll = () => {
    if (containerRef.current.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const highlight = (text) =>
    searchTerm
      ? text.replace(new RegExp(`(${searchTerm})`, 'gi'), `<mark>$1</mark>`)
      : text;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="chat-messages"
      style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}
    >
      {messages.map((msg) => (
        <div key={msg.id} className={`message ${msg.system ? 'system' : 'user'}`}>
          {msg.system ? (
            <p
              className="system-message"
              style={{ fontStyle: 'italic', color: 'gray', textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: highlight(msg.message) }}
            />
          ) : (
            <div className="message-content">
              <span style={{ color: msg.isPrivate ? 'purple' : 'black' }}>
                <strong>{msg.sender}</strong>
                {msg.isPrivate ? ' 🔒 (Private)' : ''}{' '}
                <small style={{ fontSize: '0.75rem', color: 'gray' }}>
                  ({format(new Date(msg.timestamp), 'p')})
                </small>
              </span>
              <p dangerouslySetInnerHTML={{ __html: highlight(msg.message) }} />

              {msg.reactions?.length > 0 && (
                <div style={{ fontSize: '0.85rem', marginLeft: '1rem' }}>
                  {msg.reactions.map((r, idx) => (
                    <span key={idx} style={{ marginRight: '5px' }}>
                      {r.emoji} <small>({r.username})</small>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <button onClick={() => handleReact(msg.id, '👍')}>👍</button>
                <button onClick={() => handleReact(msg.id, '❤️')}>❤️</button>
                <button onClick={() => handleReact(msg.id, '😂')}>😂</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ChatMessages;
