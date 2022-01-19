import { notEmptyString } from '../lib/helpers';

export class ChatNotification {
  type = 'message';

  to?: string;

  from?: string;

  message?: string;

  data?: any = null;

  time?: number;

  constructor(type = 'message', data: any = null) {
    if (type.length > 3) {
      this.type = type;
    }
    if (data instanceof Object) {
      const coreKeys = ['to', 'from', 'message', 'time', 'data'];
      const entries = Object.entries(data);
      const coreEntries = entries.filter((entry) =>
        coreKeys.includes(entry[0]),
      );
      const extraEntries = entries.filter(
        (entry) => coreKeys.includes(entry[0]) === false,
      );
      if (coreEntries.length > 0) {
        coreEntries.forEach(([key, value]) => {
          if (typeof value === 'string') {
            switch (key) {
              case 'to':
              case 'from':
              case 'message':
                this[key] = value;
                break;
            }
          }
          if (key === 'time' && typeof value === 'number') {
            this.time = value;
          }
          if (key === 'data' && value !== null) {
            this.data = value;
          }
        });
      }
      if (extraEntries.length > 0) {
        this.data = Object.fromEntries(extraEntries);
      }
    }
  }

  toObject() {
    const mp: Map<string, any> = new Map();
    mp.set('type', this.type);
    if (notEmptyString(this.to)) {
      mp.set('to', this.to);
    }
    if (notEmptyString(this.from)) {
      mp.set('from', this.from);
    }
    if (notEmptyString(this.message)) {
      mp.set('message', this.message);
    }
    if (typeof this.time === 'number' && this.time > 0) {
      mp.set('time', this.time);
    }
    if (this.data instanceof Object || this.data instanceof Array) {
      mp.set('data', this.data);
    }
    return Object.fromEntries(mp.entries());
  }

  get isMessage(): boolean {
    return (
      ['message', 'chat_message'].includes(this.type) || this.type.length < 2
    );
  }
}
