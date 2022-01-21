export interface Message {
  _id?: string;
  to?: string;
  from?: string;
  isFrom?: boolean;
  message: string;
  time: number;
}

export interface MicroMessage {
  message: string;
  time: number;
  isFrom?: boolean;
  read?: boolean;
}

export interface BasicInfo {
  valid?: boolean;
  _id?: string;
  nickName: string;
  roles?: string[];
  profileImg?: string;
  online?: boolean;
  lastMsgTs?: number;
  last?: MicroMessage;
  time?: number;
  hasReplied: boolean;
}

export interface ToFrom {
  to: string;
  from: string;
}

export interface ToFromTime extends ToFrom {
  time?: number;
}

export interface ToFromNext {
  to: string;
  from: string;
  start: number;
  limit?: number;
}

export interface FromToBasicInfo {
  from: BasicInfo[];
  to: BasicInfo[];
}
