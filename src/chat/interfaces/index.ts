export interface Message {
  _id?: string;
  to: string;
  from: string;
  message: string;
  time: number;
}
