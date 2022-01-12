import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { NestGateway } from '@nestjs/websockets/interfaces/nest-gateway.interface';
import { ChatService } from './chat.service';
import { Bind, UseInterceptors } from '@nestjs/common';
import { Chat } from './chat.entity';
import { socketIoPort } from '../.config';
import { Socket } from 'socket.io';
import {
  extractStringFromArrayOrString,
  generateChatId,
  uuidPairSort,
} from './lib/helpers';
import { isValidObjectId } from 'mongoose';
import { ToFrom } from './interfaces';

const options = {
  cors: {
    origin: ['*'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
};

@WebSocketGateway(socketIoPort, options)
export class ChatGateway implements NestGateway {
  constructor(private chatService: ChatService) {}

  afterInit(server: any) {
    console.log('Init', server.constructor);
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
      }
    }
    this.chatService.userConnected(fromId, socket.id);

    process.nextTick(async () => {
      const chatList = await this.chatService.getOtherUserInfo(fromId);
      socket.to(socket.id).emit('chat-list', chatList);
    });
  }

  handleDisconnect(socket: any) {
    const query = socket.handshake.query;
    console.log('Disconnect', socket.handshake.query);
    this.chatService.userDisconnected(query.userName);
  }

  matchChat(chat: Chat, sender: Socket) {
    const chatId = generateChatId(chat.from, chat.to);
    const exists = sender.rooms.has(chatId);
    return {
      chatId,
      exists,
    };
  }

  @Bind(MessageBody(), ConnectedSocket())
  @SubscribeMessage('chat')
  async handleNewMessage(chat: Chat, sender: Socket) {
    await this.chatService.saveChat(chat);
    const toSocketId = this.chatService.matchSocketId(chat.to);
    if (toSocketId.length > 2) {
      sender.to(toSocketId).emit('chat-message', chat);
    }
    /* sender.emit('newChat', chat);
    const { chatId, exists } = this.matchChat(chat, sender);
    sender.join(chatId);
    sender.in(chatId).emit('newChat', chat); */

    //await this.chatService.sendMessagesToOfflineUsers(chat);
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
}
