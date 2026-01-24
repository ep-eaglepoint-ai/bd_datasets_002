import React from 'react';

/**
 * MessageList component renders a list of messages with grouping for consecutive messages from the same sender
 * @param {Array} messages - Array of message objects to display
 */
function MessageList({ messages }) {
  // Group consecutive messages from the same sender within a 2-minute window
  const groupedMessages = React.useMemo(() => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message, index) => {
      const messageTime = new Date(message.timestamp);
      // Check if message can be grouped with the previous one
      const shouldGroup = currentGroup &&
        currentGroup.sender === message.sender &&
        (messageTime - new Date(currentGroup.timestamp)) < 120000; // 2 minutes

      if (shouldGroup) {
        // Add to existing group
        currentGroup.messages.push(message);
      } else {
        // Start a new group
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          sender: message.sender,
          timestamp: message.timestamp,
          messages: [message]
        };
      }
    });

    // Add the last group if it exists
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  return (
    <div className="messages">
      {/* Render each group of messages */}
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex} className={`message ${group.sender}`}>
          {/* Avatar indicator for message sender */}
          <div className="message-avatar">
            {group.sender === 'user' ? 'U' : 'AI'}
          </div>
          <div className="message-content">
            {/* Render individual messages in the group */}
            {group.messages.map((msg, msgIndex) => (
              <div key={msg.id}>
                {/* Message text */}
                {msg.text}
                {/* Show timestamp only on the last message of the group */}
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