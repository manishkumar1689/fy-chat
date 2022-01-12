import { Injectable, HttpService } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { isValidObjectId } from 'mongoose';
import { InjectModel } from 'nestjs-typegoose';
import { AxiosResponse } from 'axios';
import { Chat } from './chat.entity';
import { fyAPIBaseUri } from '../.config';
import { Message } from './interfaces';
/* import { defaultApp } from '../auth/firebase-admin'; */

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat) private readonly chatModel: ReturnModelType<typeof Chat>,
    private http: HttpService,
  ) {
    /* this.getOtherUserInfo('6061f78686f34f52da3ef446').then((result) => {
      console.log(JSON.stringify(result));
    });
    this.getUserInfo('6061f78686f34f52da3ef446').then((result) => {
      console.log(JSON.stringify(result));
    }); */
  }

  private userMap: Map<string, string> = new Map();

  getHttp(url = ''): Promise<AxiosResponse> {
    return this.http.get(url).toPromise();
  }

  postHttp(url = '', inData: any = null): Promise<AxiosResponse> {
    return this.http.post(url, inData).toPromise();
  }

  async getResource(uri = ''): Promise<any> {
    const url = [fyAPIBaseUri, uri].join('/');
    const response = await this.getHttp(url);
    if (response instanceof Object) {
      const { data } = response;
      if (data instanceof Object || data instanceof Array) {
        return data;
      }
    }
  }

  async postResource(uri = '', inData: any = null): Promise<any> {
    const url = [fyAPIBaseUri, uri].join('/');
    let result = null;
    await this.postHttp(url, inData)
      .then((response) => {
        if (response instanceof Object) {
          const { data } = response;
          if (data instanceof Object || data instanceof Array) {
            result = data;
          }
        }
      })
      .catch((e) => {
        result = e;
      });
    return result;
  }

  mapMessage(chat: Chat): Message {
    return {
      to: chat.to,
      from: chat.from,
      message: chat.message,
      time: chat.time,
    };
  }

  async getOtherUserInfo(userID = '') {
    const inData = {
      userID,
      uids: [],
    };
    const chats = await this.getChats(userID);
    if (chats.length > 0) {
      chats.forEach((row) => {
        if (
          row.to !== userID &&
          inData.uids.indexOf(row.to) < 0 &&
          isValidObjectId(row.to)
        ) {
          inData.uids.push(row.to);
        }
        if (
          row.from !== userID &&
          inData.uids.indexOf(row.from) < 0 &&
          isValidObjectId(row.from)
        ) {
          inData.uids.push(row.from);
        }
      });
    }
    const info =
      inData.uids.length > 0 && isValidObjectId(userID)
        ? await this.postResource('user/basic-by-ids', inData)
        : [];
    const rows = info.map((item) => {
      const itemId = item._id.toString();
      return {
        ...item,
        messages: chats
          .filter((ch) => ch.to === itemId || ch.from === itemId)
          .map(this.mapMessage),
      };
    });
    return { rows, valid: rows.length > 0 };
  }

  async getUserInfo(userID = '') {
    const uri = ['user', 'basic-by-id', userID].join('/');
    const user = await this.getResource(uri);
    return user;
  }

  /* async redisClient(): Promise<Redis.Redis> {
    const redisMap = this.redisService.getClients();
    return extractFromRedisMap(redisMap);
  }

  async redisGet(key: string): Promise<any> {
    const client = await this.redisClient();
    return await extractFromRedisClient(client, key);
  }

  async redisSet(key: string, value): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value);
  } */

  async getChats(
    userId = '',
    sinceTs = -1,
    skip = 0,
    max = 10000,
  ): Promise<Chat[]> {
    const fromTs =
      sinceTs > 0 ? new Date().getTime() - 90 * 24 * 60 * 60 * 100 : sinceTs;
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('$or', [{ to: userId }, { from: userId }]);
    }
    filter.set('timestamp', { $gt: fromTs });
    return await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .skip(skip)
      .limit(max);
  }

  matchSocketId(userId: string): string {
    return this.userMap.has(userId) ? this.userMap.get(userId) : '';
  }

  async saveChat(chat: Chat): Promise<void> {
    chat.time = new Date().getTime();
    await this.chatModel.create(chat);
  }

  userConnected(userId: string, token: string) {
    this.userMap.set(userId, token);
    console.log('All Users', this.userMap.entries());
  }

  userDisconnected(userId: string) {
    this.userMap.delete(userId);
  }

  /* async sendMessagesToOfflineUsers(chat: any) {
    var messagePayload = {
      data: {
        type: "CHAT",
        title: 'chat',
        message: chat.message,
        sender: chat.sender,
        recipient: chat.recipient,
        time: chat.time
      },
      tokens: []
    };
    const userTokens = this.userMap.filter(user => !this.connectedUsers.includes(user.userName)).map(user => { return user.registrationToken });
    if (userTokens.length == 0) {
      return;
    }
    messagePayload.tokens = userTokens;
    try {
      await defaultApp.messaging().sendMulticast(messagePayload);
    } catch (ex) {
      console.log(JSON.stringify(ex));
    }
  } */
}
