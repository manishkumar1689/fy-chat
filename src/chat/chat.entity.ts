import { prop } from '@typegoose/typegoose';

export class Chat {
  @prop({
    required: [true, 'Message is required'],
  })
  message: string;

  @prop({
    required: [true, 'Sender is required'],
  })
  from: string;

  @prop({
    required: [true, 'Recipient is required'],
  })
  to: string;

  @prop({
    required: [false, 'added automatically'],
  })
  time?: number;

  @prop({
    required: [false, 'added automatically'],
  })
  read?: boolean;

  constructor(chat?: Partial<Chat>) {
    Object.assign(this, chat);
    this.applyTimestamp();
  }

  applyTimestamp() {
    this.time = new Date().getTime();
    return this;
  }
}
