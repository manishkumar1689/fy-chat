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

const options = {
  cors: {
    origin: ['*'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
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
    const hasReceiver = isValidObjectId(toId);
    this.chatService.userConnected(fromId, socket.id);
    if (hasReceiver) {
      const recipientSocketId = this.chatService.matchSocketId(toId);
      if (recipientSocketId.length > 2) {
        this.chatService.getUserInfo(fromId).then((userInfo) => {
          socket.to(recipientSocketId).emit(keys.USER_CONNECTED, {
            to: toId,
            from: fromId,
            message: 'New chat request',
            user: userInfo,
          });
        });
        setTimeout(() => {
          this.chatService.getUserInfo(toId).then((userInfo) => {
            const socketId = this.chatService.matchSocketId(fromId);
            socket.to(socketId).emit(keys.USER_INFO, {
              to: toId,
              from: fromId,
              message: 'User info',
              user: userInfo,
            });
          });
        }, 250);
      }
    }

    process.nextTick(async () => {
      const socketId = this.chatService.matchSocketId(fromId);
      if (hasReceiver) {
        const convHistory = await this.chatService.fetchConversation(
          fromId,
          toId,
        );
        socket.to(socketId).emit(keys.CHAT_HISTORY, convHistory);
      } else {
        const chatList = await this.chatService.getUniqueFromAndToInfo(fromId);
        socket.to(socketId).emit(keys.CHAT_LIST, chatList);
      }
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
            socket.to(toSocketId).emit(keys.USER_DISCONNECTED, query.from);
          }
        }
      });
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.CHAT)
  async handleNewMessage(chat: Chat, sender: Socket) {
    await this.chatService.saveChat(chat);
    const toSocketId = this.chatService.matchSocketId(chat.to);
    if (toSocketId.length > 2) {
      sender.to(toSocketId).emit(keys.CHAT_MESSAGE, chat);
    } else {
      const fcm = await this.chatService.sendOfflineChatRequest(
        chat.from,
        chat.to,
      );
      if (fcm.valid) {
        const socketId = sender.id;
        sender.to(socketId).emit('chat_request_sent', {
          to: chat.to,
          from: chat.from,
          message: `${fcm} has been notified of your chat message`,
        });
      }
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage(keys.INFO_REQUEST)
  async handleInfoRequest(toFrom: ToFrom, sender: Socket) {
    const { to, from } = toFrom;
    const userInfo = await this.chatService.getUserInfo(to);
    ///const toSocketId = this.chatService.matchSocketId(to);
    const fromSocketId = this.chatService.matchSocketId(from);
    sender.to(fromSocketId).emit(keys.USER_INFO, userInfo);
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
    sender.to(sender.id).emit(keys.CHAT_HISTORY_MORE, {
      start: skip,
      limit: limitInt,
      messages,
    });
  }
}
