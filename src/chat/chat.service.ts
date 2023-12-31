import { Injectable, HttpService } from '@nestjs/common';
import { ReturnModelType } from '@typegoose/typegoose';
import { isValidObjectId, Model } from 'mongoose';
import { InjectModel } from 'nestjs-typegoose';
import { AxiosResponse } from 'axios';
import { Chat } from './chat.entity';
import { fyAPIBaseUri } from '../.config';
import { BasicInfo, Message, MicroMessage } from './interfaces';
import { notEmptyString, truncateBase64 } from './lib/helpers';

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
      read: chat.read === true,
    };
  }

  mapMessage(chat: Chat): Message {
    return {
      to: chat.to,
      from: chat.from,
      message: chat.message,
      time: chat.time,
      read: chat.read === true,
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
    if (info instanceof Array) {
      for (const item of info) {
        const itemId = item._id.toString();
        const online = this.userMap.has(item._id);
        const { ts, read } = await this.fetchLastFromMessageTsRead(item._id);
        rows.push({
          ...item,
          online,
          lastMsgTs: ts,
          lastMsgRead: read,
          messages: chats
            .filter((ch) => ch.to === itemId || ch.from === itemId)
            .map((ch) => this.mapMessageItem(ch, userID)),
        });
      }
    }
    return { rows, valid: rows.length > 0 };
  }

  async getUserInfo(userID = ''): Promise<BasicInfo> {
    const uri = ['user', 'basic-by-id', userID].join('/');
    const info = await this.getResource(uri);
    const online = this.userMap.has(userID);
    const { ts, read } = await this.fetchLastFromMessageTsRead(userID);
    return { ...info, online, lastMsgTs: ts, lastMsgRead: read };
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
        .select('-_id to from message time read')
        .sort({ time: -1 })
        .skip(skip)
        .limit(max);
    }
    return items;
  }

  async countUnread(
    fromId = '',
    toId = '',
    sinceTs = -1,
    max = 100,
  ): Promise<number> {
    const fromTs =
      sinceTs > 0 ? new Date().getTime() - 28 * 24 * 60 * 60 * 100 : sinceTs;
    const filter: Map<string, any> = new Map();
    const validToId = notEmptyString(toId, 12) && isValidObjectId(toId);
    const validFromId = notEmptyString(fromId) && isValidObjectId(fromId);
    let numUnread = 0;
    if (validFromId && validToId) {
      filter.set('to', toId);
      filter.set('from', fromId);
      filter.set('$or', [{ read: false }, { read: { $exists: false } }]);
      filter.set('time', { $gte: fromTs });
      const countNum = await this.chatModel
        .count(Object.fromEntries(filter.entries()))
        .limit(max);
      if (typeof countNum === 'number') {
        numUnread = countNum;
      }
    }
    return numUnread;
  }

  async getUniqueInteractions(userId = ''): Promise<BasicInfo[]> {
    const { fromIds, toIds } = await this.getUniqueFromAndTo(userId);
    const ids: string[] = [];
    const items: BasicInfo[] = [];
    for (const fromId of fromIds) {
      const ui = await this.getUserInfo(fromId);
      ids.push(fromId);
      if (ui instanceof Object && notEmptyString(ui.nickName)) {
        const last = await this.fetchLastMicroMessage(fromId, userId);
        const numUnread = await this.countUnread(fromId, userId);
        items.push({ ...ui, last, numUnread, hasReplied: true } as BasicInfo);
      }
    }
    for (const toId of toIds) {
      const ui = await this.getUserInfo(toId);
      if (ids.indexOf(toId) < 0) {
        ids.push(toId);
        if (ui instanceof Object && notEmptyString(ui.nickName)) {
          const last = await this.fetchLastMicroMessage(toId, userId);
          items.push({ ...ui, last, hasReplied: false } as BasicInfo);
        }
      }
    }
    items.sort((a, b) => b.last.time - a.last.time);
    return items;
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

  async fetchLastMessage(fromId = '', toId = ''): Promise<Chat> {
    const filter: Map<string, any> = new Map();
    if (
      notEmptyString(fromId, 16) &&
      isValidObjectId(fromId) &&
      notEmptyString(toId, 16) &&
      isValidObjectId(toId)
    ) {
      filter.set('$or', [
        { from: fromId, to: toId },
        { from: toId, to: fromId },
      ]);
    }
    const msgs = await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .select('-_id from to message time read')
      .sort({ time: -1 })
      .skip(0)
      .limit(1);
    return msgs instanceof Array && msgs.length > 0
      ? msgs[0]
      : ({ from: '', to: '', message: '', time: 0, read: false } as Chat);
  }

  async fetchLastMicroMessage(fromId = '', toId = ''): Promise<MicroMessage> {
    const chat = await this.fetchLastMessage(fromId, toId);
    return {
      message: chat.message,
      time: chat.time,
      read: chat.read === true,
      isFrom: toId === chat.from,
    };
  }

  async fetchLastFromMessageTs(userId = ''): Promise<number> {
    const { ts } = await this.fetchLastFromMessageTsRead(userId);
    return ts;
  }

  async fetchLastFromMessageTsRead(
    userId = '',
  ): Promise<{ ts: number; read: boolean }> {
    const filter: Map<string, any> = new Map();
    if (isValidObjectId(userId)) {
      filter.set('from', userId);
    }
    const msgs = await this.chatModel
      .find(Object.fromEntries(filter.entries()))
      .select('-_id read time')
      .sort({ time: -1 })
      .skip(0)
      .limit(1);
    let ts = 0;
    let read = false;
    if (msgs instanceof Array && msgs.length > 0) {
      if (msgs[0] instanceof Model) {
        ts = msgs[0].time;
        read = msgs[0].read === true;
      }
    }
    return { ts, read };
  }

  /*
   * Set time to -1 to mark messages as unread since 5 minutes before last message
   * Otherwise specify the since timestamp
   * The zero default will set all messages as unread
   */
  async setReadFlag(from = '', to = '', time = 0): Promise<number> {
    let tsStart = time - 60 * 1000;
    if (time < 0) {
      const lastMsg = await this.fetchLastMicroMessage(to, from);
      if (lastMsg instanceof Object) {
        if (lastMsg.time > 1000) {
          const fiveMinutesMs = 5 * 60 * 1000;
          tsStart = lastMsg.time - fiveMinutesMs;
        }
      }
    }
    if (tsStart < 60 * 60 * 1000) {
      // if otherwise unspecified set 1 week ago
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      tsStart = new Date().getTime() - oneWeekMs;
    }
    const criteria = {
      from,
      to,
      time: {
        $gte: tsStart,
      },
    };
    const updated = await this.chatModel.updateMany(criteria, {
      read: true,
    });
    let numMarked = 0;
    if (updated instanceof Object) {
      if (updated.acknowledged) {
        numMarked = updated.matchedCount;
      }
    }
    return numMarked;
  }

  async getUnreadTotal(userID = '') {
    const total = await this.chatModel.count({
      to: userID,
      $or: [{ read: false }, { read: { $exists: false } }],
    });
    return typeof total === 'number' ? total : -1;
  }

  matchSocketId(userId: string): string {
    return this.userMap.has(userId) ? this.userMap.get(userId) : '';
  }

  async saveChat(chat: Chat): Promise<Chat> {
    chat.time = new Date().getTime();
    return await this.chatModel.create(chat);
  }

  userConnected(userId: string, token: string) {
    this.userMap.set(userId, token);
  }

  async userDisconnected(userId: string) {
    this.userMap.delete(userId);
    return await this.getUniqueFromAndTo(userId);
  }

  async sendOfflineChatRequest(chat: Chat) {
    const { from, to, message } = chat;
    const msgStr = truncateBase64(message);
    const uri = ['feedback', 'send-chat-request', from, to, msgStr].join('/');
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
