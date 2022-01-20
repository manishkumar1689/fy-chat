import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { NestGateway } from '@nestjs/websockets/interfaces/nest-gateway.interface';
import { ChatService } from './chat.service';
import { Bind } from '@nestjs/common';
import { Chat } from './chat.entity';
import { socketIoPort } from '../.config';
import { Socket } from 'socket.io';
import {
  extractStringFromArrayOrString,
  isNumeric,
  notEmptyString,
  smartCastInt,
} from './lib/helpers';
import { isValidObjectId } from 'mongoose';
import { ToFrom, ToFromNext } from './interfaces';
import { keys } from './settings/keys';
import { ChatNotification } from './models/chat-notification';

const options = {
  cors: {
    origin: ['*'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
};

@WebSocketGateway(socketIoPort, options)
export class ChatGateway implements NestGateway {
  private initialised = false;

  constructor(private chatService: ChatService) {}

  afterInit(server: any) {
    if (server instanceof Object) {
      this.initialised = true;
    }
  }

  handleConnection(socket: Socket) {
    const query = socket.handshake.query;
    const fromId = extractStringFromArrayOrString(query.from);
    const toId = extractStringFromArrayOrString(query.to);
    const hasReceiver = notEmptyString(toId, 16) && isValidObjectId(toId);
    this.chatService.userConnected(fromId, socket.id);
    if (hasReceiver) {
      const recipientSocketId = this.chatService.matchSocketId(toId);
      if (recipientSocketId.length > 2) {
        this.chatService.getUserInfo(fromId).then((userInfo) => {
          this.sendChatData(socket, recipientSocketId, keys.USER_CONNECTED, {
            to: toId,
            from: fromId,
            message: 'New chat request',
            ...userInfo,
          });
        });
        setTimeout(() => {
          this.chatService.getUserInfo(toId).then((userInfo) => {
            const socketId = this.chatService.matchSocketId(fromId);
            this.sendChatData(socket, socketId, keys.USER_INFO, {
              to: toId,
              from: fromId,
              message: 'User info',
              ...userInfo,
            });
          });
        }, 250);
      }
    }

    process.nextTick(async () => {
      const socketId = this.chatService.matchSocketId(fromId);
      if (hasReceiver) {
        this.sendChatHistory(socket, fromId, toId);
      } else {
        const chatList = await this.chatService.getUniqueInteractions(fromId);
        this.sendChatData(socket, socketId, keys.CHAT_LIST, {
          to: toId,
          data: chatList,
        });
        if (chatList.length > 0) {
          chatList.forEach((row) => {
            if (row._id !== toId) {
              const otherSocketId = this.chatService.matchSocketId(row._id);
              if (otherSocketId.length > 2) {
                this.sendChatData(socket, otherSocketId, keys.USER_CONNECTED, {
                  to: row._id,
                  from: fromId,
                  message: 'New chat request',
                  ...row,
                });
              }
            }
          });
        }
      }
    });
  }

  sendChatData(socket: Socket, toSocketId, eventKey = '', payload: any = null) {
    const data = new ChatNotification(eventKey, payload);
    const r = socket.to(toSocketId).emit(keys.CHAT_DATA, data.toObject());
    //console.log(eventKey, toSocketId, r, data.toObject());
  }

  async sendChatHistory(socket: Socket, fromId = '', toId = '') {
    const convHistory = await this.chatService.fetchConversation(fromId, toId);
    const socketId = this.chatService.matchSocketId(fromId);
    this.sendChatData(socket, socketId, keys.CHAT_HISTORY, {
      from: fromId,
      to: toId,
      data: convHistory,
    });
  }

  handleDisconnect(socket: any) {
    const query = socket.handshake.query;
    const fromId = extractStringFromArrayOrString(query.from);
    if (notEmptyString(fromId, 12)) {
      this.chatService.userDisconnected(query.from).then((result) => {
        const { fromIds } = result;
        for (const fromId of fromIds) {
          const toSocketId = this.chatService.matchSocketId(fromId);
          if (notEmptyString(toSocketId, 3)) {
            this.sendChatData(socket, toSocketId, keys.USER_DISCONNECTED, {
              from: query.from,
            });
          }
        }
      });
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.CHAT)
  async handleChatNotification(inData: any = null, sender: Socket) {
    if (inData instanceof Object) {
      const { type } = inData;
      const eventType = notEmptyString(type, 2) ? type : 'message';
      const isMessage = ['message', 'chat_message'].includes(eventType);
      if (isMessage) {
        const chat = new Chat(inData);
        this.handleMessage(chat, sender);
      } else {
        this.handleDataRequest(inData, sender);
      }
    }
  }

  async handleDataRequest(inData: any = null, sender: Socket) {
    let socketId = '';
    let eventType = '';
    let payload: any = {};
    switch (inData.type) {
      default:
        socketId = this.chatService.matchSocketId(inData.from);
        break;
    }
    switch (inData.type) {
      case keys.HISTORY_REQUEST:
        const convHistory = await this.chatService.fetchConversation(
          inData.from,
          inData.to,
        );
        payload = {
          from: inData.from,
          to: inData.to,
          data: convHistory,
        };
        eventType = keys.CHAT_HISTORY;
        break;
      case keys.INFO_REQUEST:
        const userInfo = await this.chatService.getUserInfo(inData.to);
        payload = {
          to: inData.to,
          from: inData.from,
          ...userInfo,
        };
        eventType = keys.USER_INFO;
        break;
    }
    if (notEmptyString(socketId)) {
      this.sendChatData(sender, socketId, eventType, payload);
    }
  }

  async handleMessage(chat: Chat, sender: Socket) {
    const newChat = await this.chatService.saveChat(chat);
    const toSocketId = this.chatService.matchSocketId(chat.to);
    if (toSocketId.length > 2) {
      this.sendChatData(sender, toSocketId, keys.CHAT_MESSAGE, chat);
      setTimeout(() => {
        this.sendChatData(sender, sender.id, keys.MESSAGE_RECEIVED, {
          from: chat.from,
          to: chat.to,
          message: 'received',
          time: newChat.time,
        });
      }, 250);
    } else {
      const fcm = await this.chatService.sendOfflineChatRequest(
        chat.from,
        chat.to,
      );
      if (fcm.valid) {
        const socketId = sender.id;
        this.sendChatData(sender, socketId, keys.CHAT_REQUEST_SENT, {
          to: chat.to,
          from: chat.from,
          message: `${fcm} has been notified of your chat message`,
        });
      }
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.HISTORY_REQUEST)
  async handleHistoryRequest(toFrom: ToFrom, sender: Socket) {
    const { from, to } = toFrom;
    this.sendChatHistory(sender, from, to);
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.INFO_REQUEST)
  async handleInfoRequest(toFrom: ToFrom, sender: Socket) {
    const { to, from } = toFrom;
    const userInfo = await this.chatService.getUserInfo(to);
    const fromSocketId = this.chatService.matchSocketId(from);
    this.sendChatData(sender, fromSocketId, keys.USER_INFO, {
      to,
      from,
      ...userInfo,
    });
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.IS_TYPING)
  async handleIsTyping(toFrom: ToFrom, sender: Socket) {
    const { to, from } = toFrom;
    const toSocketId = this.chatService.matchSocketId(to);
    this.sendChatData(sender, toSocketId, keys.IS_TYPING_RESPONSE, {
      to,
      from,
    });
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.MORE_MESSAGES)
  async fetchMoreMessages(toFrom: ToFromNext, sender: Socket) {
    const { to, from, start, limit } = toFrom;
    const limitInt = isNumeric(limit) ? smartCastInt(limit, 100) : 100;
    const skip = smartCastInt(start, 100);
    const history = await this.chatService.fetchConversation(
      to,
      from,
      skip,
      limitInt,
    );
    const messages = history.messages instanceof Array ? history.messages : [];
    this.sendChatData(sender, sender.id, keys.CHAT_HISTORY_MORE, {
      start: skip,
      limit: limitInt,
      data: messages,
    });
  }
}
