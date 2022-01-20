export const keys = {
  CHAT_DATA: 'chat_data',
  CHAT: 'chat',
  CHAT_MESSAGE: 'chat_message',
  USER_CONNECTED: 'user_connected',
  MESSAGE_RECEIVED: 'message_received',
  USER_INFO: 'user_info', // server sends user info about the current user if the _id cannot be mapped to another profile
  CHAT_HISTORY: 'chat_history', // sent automatically by the server when starting a new chat
  CHAT_LIST: 'chat_list', // list of users with last message and online status
  USER_DISCONNECTED: 'user_disconnected',
  IS_TYPING: 'is_typing',
  IS_TYPING_RESPONSE: 'is_typing_response',
  INFO_REQUEST: 'info_request',
  HISTORY_REQUEST: 'history_request', // ask server for initial batch of chat messages
  MORE_MESSAGES: 'more_messages', // ask server for more messages in a conversation
  CHAT_HISTORY_MORE: 'chat_history_more', // server sends back more chat history
  CHAT_REQUEST_SENT: 'chat_request_sent',
};

export const keyDefinitions = {
  CHAT_DATA: {
    mode: 'send',
    text: `handle all client requests`,
    payload: {
      type: `string: e.g. message, chat_list, chat_history`,
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      data: `any: may be a message`,
    },
  },
  CHAT: {
    mode: 'receive',
    text: `send 1-on-1 chat message to the server`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
    },
  },
  CHAT_MESSAGE: {
    mode: 'subevent',
    text: `1-on-1 message sent from server`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
      time: `int [milliseconds since 1970-01-01]`,
    },
  },
  MESSAGE_RECEIVED: {
    mode: 'subevent',
    text: `Message has been received`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      time: `int`,
    },
  },
  USER_CONNECTED: {
    mode: 'subevent',
    text: `server notifies the other user that the user has connected`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
      data: {
        _id: 'string',
        nickName: 'string',
        roles: 'string[]',
        profileImg: 'string: URI',
      },
    },
  },
  CHAT_HISTORY: {
    mode: 'subevent',
    text: `sent automatically by the server when starting a new chat`,
    payload: {
      _id: `string`,
      nickName: 'string',
      roles: 'string[]',
      profileImg: 'string: URI',
      start: `int`,
      limit: `int`,
      messages: 'BasicMsg[]',
    },
  },
  HISTORY_REQUEST: {
    mode: 'receive',
    text: `ask server for chat history`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      start: `int`,
      limit: `int`,
    },
  },
  MORE_MESSAGES: {
    mode: 'receive',
    text: `ask server for more messages in a conversation`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      start: `int`,
      limit: `int`,
    },
  },
  CHAT_HISTORY_MORE: {
    mode: 'subevent',
    text: `server sends back more chat history`,
    payload: {
      start: `int`,
      limit: `int`,
      messages: 'BasicMsg[]',
    },
  },
  CHAT_LIST: {
    mode: 'subevent',
    text: `list of users with last message and online status`,
    payload: {
      from: `BasicInfo[]`,
      to: `BasicInfo[]`,
    },
  },
  USER_DISCONNECTED: {
    mode: 'subevent',
    text: `Server informs client that a user has disconnected`,
    payload: `[USER_ID]`,
  },
  IS_TYPING: {
    mode: 'receive',
    text: `Tell server the other user is typing`,
    payload: {
      from: `string [USER_ID]`,
      to: `string [USER_ID]`,
    },
  },
  IS_TYPING_RESPONSE: {
    mode: 'subevent',
    text: `Tell client the other user is typing`,
    payload: {
      from: `string [USER_ID]`,
    },
  },
  CHAT_REQUEST_SENT: {
    mode: 'subevent',
    text: `FCM notification sent to offline chat partner`,
    payload: {
      to: `string [USER_ID]`,
      from: `string [USER_ID]`,
    },
  },
  INFO_REQUEST: {
    mode: 'receive',
    text: `string: [USER_ID] of other person`,
    to: {},
    from: `string: your USER_ID`,
  },
  USER_INFO: {
    mode: 'subevent',
    text: `server sends user info about the current user if the _id cannot be mapped to another profile`,
    payload: {
      _id: 'string',
      nickName: 'string',
      roles: 'string[]',
      profileImg: 'string: URI',
    },
  },
};

const customTypes = {
  BasicMsg: {
    isFrom: `boolean: is from the same user`,
    message: `string`,
    time: `int`,
  },
  BasicInfo: {
    valid: `boolean: ID matches active user account`,
    _id: 'string: [USER_ID]',
    nickName: 'string',
    roles: `string[]`,
    profileImg: `string: URI`,
    online: `boolean`,
    lastMsgTs: `int`,
    last: {
      message: `string`,
      time: `int`,
    },
  },
};

export const renderKeyDefinitions = () => {
  const defKeys = Object.keys(keyDefinitions);
  const eventKeys = Object.entries(keys).map(([k, v]) => {
    const definition = defKeys.includes(k)
      ? keyDefinitions[k]
      : { text: v.replace(/_/g, ' ') };
    return {
      key: v,
      ...definition,
    };
  });
  return {
    eventKeys,
    customTypes,
  };
};
