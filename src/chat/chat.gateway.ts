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
    const userId = extractStringFromArrayOrString(query.userId);
    const receiverId = extractStringFromArrayOrString(query.toId);
    //const chatId = generateChatId(userId, receiverId);
    const recipientSocketId = this.chatService.matchSocketId(receiverId);
    console.log(recipientSocketId, 98);
    if (recipientSocketId.length > 2) {
      this.chatService.getUserInfo(receiverId).then((result) => {
        socket.to(recipientSocketId).emit('chat-request', {
          to: receiverId,
          from: userId,
          message: 'New chat request',
          user: result,
        });
      });
    }
    this.chatService.userConnected(userId, socket.id);
    process.nextTick(async () => {
      const chatList = await this.chatService.getOtherUserInfo(userId);
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
    console.log('New Chat', chat);
    await this.chatService.saveChat(chat);
    const toSocketId = this.chatService.matchSocketId(chat.to);
    if (toSocketId.length > 2) {
      sender.to(toSocketId).emit('chat', chat);
    }
    /* sender.emit('newChat', chat);
    const { chatId, exists } = this.matchChat(chat, sender);
    sender.join(chatId);
    sender.in(chatId).emit('newChat', chat); */

    //await this.chatService.sendMessagesToOfflineUsers(chat);
  }
}
