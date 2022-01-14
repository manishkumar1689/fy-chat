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
  CHAT: {
    text: `send 1-on-1 chat message to the server`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
    },
  },
  CHAT_MESSAGE: {
    text: `1-on-1 message sent from server`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
      time: `int [milliseconds since 1970-01-01]`,
    },
  },
  USER_CONNECTED: {
    text: `server notifies the other user that the user has connected`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      message: `string: text`,
      user: {
        _id: 'string',
        nickName: 'string',
        roles: 'string[]',
        profileImg: 'string: URI',
      },
    },
  },
  CHAT_HISTORY: {
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
  MORE_MESSAGES: {
    text: `ask server for more messages in a conversation`,
    payload: {
      to: `string: [USER_ID]`,
      from: `string: [USER_ID]`,
      start: `int`,
      limit: `int`,
    },
  },
  CHAT_HISTORY_MORE: {
    text: `server sends back more chat history`,
    payload: {
      start: `int`,
      limit: `int`,
      messages: 'BasicMsg[]',
    },
  },
  CHAT_LIST: {
    text: `list of users with last message and online status`,
    payload: {
      from: `BasicInfo[]`,
      to: `BasicInfo[]`,
    },
  },
  USER_DISCONNECTED: {
    text: `Server informs client that a user has disconnected`,
    payload: `[USER_ID]`,
  },
  INFO_REQUEST: {
    to: {
      text: `string: [USER_ID] of other person`,
    },
    from: `string: your USER_ID`,
  },
  USER_INFO: {
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
  const socketKeys = Object.entries(keys).map(([k, v]) => {
    const definition = defKeys.includes(k)
      ? keyDefinitions[k]
      : { text: v.replace(/_/g, ' ') };
    return {
      key: v,
      definition,
    };
  });
  return {
    socketKeys,
    customTypes,
  };
};
