import React from 'react';

/**
 * MessageList component renders a list of messages with grouping for consecutive messages from the same sender
 * @param {Array} messages - Array of message objects to display
 */
function MessageList({ messages }) {
  const groupedMessages = React.useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message, index) => {
      const messageTime = new Date(message.timestamp);
      const shouldGroup = currentGroup &&
        currentGroup.sender === message.sender &&
        (messageTime - new Date(currentGroup.timestamp)) < 120000;

      if (shouldGroup) {
        currentGroup.messages.push(message);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          sender: message.sender,
          timestamp: message.timestamp,
          messages: [message]
        };
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  return (
    <div className="messages">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex} className={`message ${group.sender}`}>
          <div className="message-avatar">
            {group.sender === 'user' ? 'U' : 'AI'}
          </div>
          <div className="message-content">
            {group.messages.map((msg, msgIndex) => (
              <div key={msg.id}>
                {msg.text}
                {msgIndex === group.messages.length - 1 && (
                  <div className="message-timestamp">
                    {new Date(group.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;