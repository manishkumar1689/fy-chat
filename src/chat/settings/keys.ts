export const keys = {
  CHAT: 'chat',
  CHAT_MESSAGE: 'chat_message',
  USER_CONNECTED: 'user_connected',
  USER_INFO: 'user_info', // server sends user info about the current user if the _id cannot be mapped to another profile
  CHAT_HISTORY: 'chat_history', // sent automatically by the server when starting a new chat
  CHAT_LIST: 'chat_list', // list of users with last message and online status
  USER_DISCONNECTED: 'user_disconnected',
  INFO_REQUEST: 'info_request',
  MORE_MESSAGES: 'more_messages', // ask server for more messages in a conversation
  CHAT_HISTORY_MORE: 'chat_history_more', // server sends back more chat history
};

export const keyDefinitions = {
  CHAT: `send 1-on-1 chat message to the server`,
  CHAT_MESSAGE: `1-on-1 message sent from server`,
  USER_CONNECTED: `server notifies the other user that the user has connected`,
  USER_INFO: `server sends user info about the current user if the _id cannot be mapped to another profile`,
  CHAT_HISTORY: `sent automatically by the server when starting a new chat`,
  CHAT_LIST: `list of users with last message and online status`,
  USER_DISCONNECTED: `Server informs client that a user has disconnected`,
  INFO_REQUEST: `Information request sent to the server`,
  MORE_MESSAGES: `ask server for more messages in a conversation`,
  CHAT_HISTORY_MORE: `server sends back more chat history`,
};

export const renderKeyDefinitions = () => {
  const defKeys = Object.keys(keyDefinitions);
  return Object.entries(keys).map(([k, v]) => {
    const definition = defKeys.includes(k)
      ? keyDefinitions[k]
      : v.replace(/_/g, ' ');
    return {
      key: v,
      definition,
    };
  });
};
