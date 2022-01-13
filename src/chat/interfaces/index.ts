export interface Message {
  _id?: string;
  to?: string;
  from?: string;
  isFrom?: boolean;
  message: string;
  time: number;
}

export interface ToFrom {
  to: string;
  from: string;
}
