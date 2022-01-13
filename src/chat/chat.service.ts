import { Injectable, HttpService } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { isValidObjectId } from 'mongoose';
import { InjectModel } from 'nestjs-typegoose';
import { AxiosResponse } from 'axios';
import { Chat } from './chat.entity';
import { fyAPIBaseUri } from '../.config';
import { Message } from './interfaces';
import { notEmptyString } from './lib/helpers';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat) private readonly chatModel: ReturnModelType<typeof Chat>,
    private http: HttpService,
  ) {}

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

  mapMessageItem(chat: Chat, fromId = ''): Message {
    return {
      isFrom: fromId === chat.from,
      message: chat.message,
      time: chat.time,
    };
  }

  mapMessage(chat: Chat): Message {
    return {
      to: chat.to,
      from: chat.from,
      message: chat.message,
      time: chat.time,
    };
  }

  async fetchConversation(userID = '', toID = '', skip = 0, limit = 100) {
    const data = await this.getOtherUserInfo(userID, toID, skip, limit);
    if (data instanceof Object && Object.keys('rows')) {
      const { rows } = data;
      if (rows instanceof Array && rows.length > 0) {
        return { ...rows[0], start: skip, limit, valid: true };
      }
    }
    return { valid: false };
  }

  async getOtherUserInfo(userID = '', toID = '', skip = 0, limit = 100) {
    const inData = {
      userID,
      uids: [],
    };
    const chats = await this.getChats(userID, toID, -1, skip, limit);
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
    const rows = [];
    for (const item of info) {
      const itemId = item._id.toString();
      const online = this.userMap.has(item._id);
      const lastMsgTs = await this.fetchLastFromMessageTs(item._id);
      rows.push({
        ...item,
        online,
        lastMsgTs,
        messages: chats
          .filter((ch) => ch.to === itemId || ch.from === itemId)
          .map((ch) => this.mapMessageItem(ch, userID)),
      });
    }
    return { rows, valid: rows.length > 0 };
  }

  async getUserInfo(userID = '') {
    const uri = ['user', 'basic-by-id', userID].join('/');
    const info = await this.getResource(uri);
    const online = this.userMap.has(userID);
    const lastMsgTs = await this.fetchLastFromMessageTs(userID);
    return { ...info, online, lastMsgTs };
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
    toId = '',
    sinceTs = -1,
    skip = 0,
    max = 100,
  ): Promise<Chat[]> {
    const fromTs =
      sinceTs > 0 ? new Date().getTime() - 366 * 24 * 60 * 60 * 100 : sinceTs;
    const filter: Map<string, any> = new Map();
    const hasToId = notEmptyString(toId, 12);
    const validUserId = isValidObjectId(userId);
    let validFilter = false;
    if (validUserId) {
      if (hasToId) {
        if (isValidObjectId(toId)) {
          filter.set('$or', [
            { to: userId, from: toId },
            { to: toId, from: userId },
          ]);
          validFilter = true;
        }
      } else {
        filter.set('$or', [{ to: userId }, { from: userId }]);
        validFilter = true;
      }
    }
    let items: any[] = [];
    if (validFilter) {
      filter.set('time', { $gt: fromTs });
      items = await this.chatModel
        .find(Object.fromEntries(filter.entries()))
        .select('-_id to from message time')
        .sort({ time: -1 })
        .skip(skip)
        .limit(max);
    }
    return items;
  }

  async getUniqueFromAndToInfo(userId = '') {
    const { fromIds, toIds } = await this.getUniqueFromAndTo(userId);
    const ids: string[] = [];
    const from: any[] = [];
    const to: any[] = [];
    for (const fromId of fromIds) {
      const ui = await this.getUserInfo(fromId);
      ids.push(fromId);
      if (ui instanceof Object) {
        const last = await this.fetchLastFromMessage(fromId);
        from.push({ ...ui, last });
      }
    }
    for (const toId of toIds) {
      const ui = await this.getUserInfo(toId);
      if (ids.indexOf(toId) < 0) {
        ids.push(toId);
        if (ui instanceof Object) {
          const last = await this.fetchLastToMessage(toId);
          to.push({ ...ui, last });
        }
      }
    }
    return { from, to };
  }

  async getUniqueFromAndTo(userId = '') {
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('$or', [{ to: userId }, { from: userId }]);
    }
    const matchStep = {
      $match: Object.fromEntries(filter.entries()),
    };
    const fromGroup = {
      $group: {
        _id: '$from',
      },
    };
    const fromIds = await this.chatModel.aggregate([matchStep, fromGroup]);
    const toGroup = {
      $group: {
        _id: '$to',
      },
    };
    const toIds = await this.chatModel.aggregate([matchStep, toGroup]);
    const filterMapToFrom = (rows: any[]) => {
      return rows instanceof Array
        ? rows
            .filter((row) => row instanceof Object && row._id !== userId)
            .map((row) => row._id)
        : [];
    };
    return {
      fromIds: filterMapToFrom(fromIds),
      toIds: filterMapToFrom(toIds),
    };
  }

  async fetchLastFromMessage(userId = '') {
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('from', userId);
    }
    const msgs = await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .select('-_id message time')
      .sort({ time: -1 })
      .skip(0)
      .limit(1);
    return msgs instanceof Array && msgs.length > 0 ? msgs[0] : {};
  }

  async fetchLastFromMessageTs(userId = ''): Promise<number> {
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('from', userId);
    }
    const msgs = await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .select('-_id time')
      .sort({ time: -1 })
      .skip(0)
      .limit(1);
    let ts = 0;
    if (msgs instanceof Array && msgs.length > 0) {
      ts = msgs[0].time;
    }
    return ts;
  }

  async fetchLastToMessage(userId = '') {
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('to', userId);
    }
    await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .sort({ time: -1 })
      .skip(0)
      .limit(1);
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
    //console.log('All Users', this.userMap.entries());
  }

  async userDisconnected(userId: string) {
    this.userMap.delete(userId);
    return await this.getUniqueFromAndTo(userId);
  }

  async sendOfflineChatRequest(from = '', to = '') {
    const uri = ['feedback', 'send-chat-request', from, to].join('/');
    const result = await this.getResource(uri);
    if (
      result instanceof Object &&
      result.valid &&
      Object.keys(result).includes('fcm')
    ) {
      const keys = Object(result.fcm) ? Object.keys(result.fcm) : [];
      const hasBeenSent = keys.length > 1;
      return hasBeenSent ? { ...result.fcm, valid: true } : { valid: false };
    } else {
      return { valid: false };
    }
  }
}
