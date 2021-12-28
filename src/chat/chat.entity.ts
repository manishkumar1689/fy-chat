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
    required: [true, 'Time is required'],
  })
  time: number;

  constructor(chat?: Partial<Chat>) {
    Object.assign(this, chat);
  }
}