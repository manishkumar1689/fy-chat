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
    if (hasReceiver) {
      const recipientSocketId = this.chatService.matchSocketId(toId);
      if (recipientSocketId.length > 2) {
        this.chatService.getUserInfo(fromId).then((userInfo) => {
          socket.to(recipientSocketId).emit('user-connected', {
            to: toId,
            from: fromId,
            message: 'New chat request',
            user: userInfo,
          });
        });
        this.chatService.getUserInfo(toId).then((userInfo) => {
          socket.to(socket.id).emit('user-info', {
            to: toId,
            from: fromId,
            message: 'User info',
            user: userInfo,
          });
        });
      }
    }
    this.chatService.userConnected(fromId, socket.id);

    process.nextTick(async () => {
      if (hasReceiver) {
        const convHistory = await this.chatService.fetchConversation(
          fromId,
          toId,
        );
        socket.to(socket.id).emit('conversation-history', convHistory);
      } else {
        const chatList = await this.chatService.getUniqueFromAndToInfo(fromId);
        socket.to(socket.id).emit('chat-list', chatList);
      }
    });
  }

  handleDisconnect(socket: any) {
    const query = socket.handshake.query;
    const fromId = extractStringFromArrayOrString(query.from);
    if (notEmptyString(fromId, 12)) {
      this.chatService.userDisconnected(query.from);
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage('chat')
  async handleNewMessage(chat: Chat, sender: Socket) {
    await this.chatService.saveChat(chat);
    const toSocketId = this.chatService.matchSocketId(chat.to);
    if (toSocketId.length > 2) {
      sender.to(toSocketId).emit('chat-message', chat);
    } else {
      const fcm = await this.chatService.sendOfflineChatRequest(
        chat.from,
        chat.to,
      );
      if (fcm.valid) {
        const socketId = sender.id;
        sender.to(socketId).emit('chat-request-sent', {
          to: chat.to,
          from: chat.from,
          message: `${fcm} has been notified of your chat message`,
        });
      }
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage('info-request')
  async handleInfoRequest(toFrom: ToFrom, sender: Socket) {
    const { to, from } = toFrom;
    const userInfo = await this.chatService.getUserInfo(to);
    const toSocketId = this.chatService.matchSocketId(from);
    if (toSocketId.length > 2) {
      sender.to(toSocketId).emit('user-info', userInfo);
    }
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage('more-messages')
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

    sender.to(sender.id).emit('conversation-history-more', {
      start: skip,
      limit: limitInt,
      history,
    });
  }
}
