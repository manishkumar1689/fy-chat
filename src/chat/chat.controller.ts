import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from './chat.service';
import { isNumeric, notEmptyString, smartCastInt } from './lib/helpers';
import { renderKeyDefinitions } from './settings/keys';

@UseGuards(AuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages/:userID')
  async getChats(@Res() res, @Param('userID') userID = '') {
    const validId = isValidObjectId(userID);
    const result = validId
      ? await this.chatService.getOtherUserInfo(userID)
      : { valid: false };
    return res.json(result);
  }

  @Get('info/:userID')
  async getUserInfo(@Res() res, @Param('userID') userID = '') {
    const validId = isValidObjectId(userID);
    const result = validId
      ? await this.chatService.getUserInfo(userID)
      : { valid: false, rows: [] };
    const status = result.valid ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(result);
  }

  @Get('chat-list/:userID')
  async getUniqueIds(@Res() res, @Param('userID') userID = '') {
    const validId = notEmptyString(userID, 16) && isValidObjectId(userID);
    let result = [];
    if (validId) {
      result = await this.chatService.getUniqueInteractions(userID);
    }
    return res.json(result);
  }

  @Get('set-read/:from/:to/:timeRef?')
  async setMessageRead(
    @Res() res,
    @Param('to') to = '',
    @Param('from') from = '',
    @Param('timeRef') timeRef = '',
  ) {
    const validId =
      notEmptyString(to, 16) &&
      isValidObjectId(to) &&
      notEmptyString(from, 16) &&
      isValidObjectId(from);
    const result: any = { valid: false, numMarkedAsRead: 0 };
    if (validId) {
      const time = isNumeric(timeRef) ? smartCastInt(timeRef) : 0;
      result.valid = true;
      result.numMarkedAsRead = await this.chatService.setReadFlag(
        to,
        from,
        time,
      );
    }
    return res.json(result);
  }

  @Get('chat-history/:from/:to/:start?/:limit?')
  async getChatHistory(
    @Res() res,
    @Param('from') from = '',
    @Param('to') to = '',
    @Param('start') start = '',
    @Param('limit') limit = '',
  ) {
    const validIds = isValidObjectId(from) && isValidObjectId(to);
    let result: any = { valid: false };
    if (validIds) {
      const startInt = isNumeric(start) ? smartCastInt(start, 0) : 0;
      const limitInt = isNumeric(limit) ? smartCastInt(limit, 100) : 100;
      result = await this.chatService.fetchConversation(
        from,
        to,
        startInt,
        limitInt,
      );
    }
    return res.json(result);
  }

  @Get('socket-info')
  async getKeyInfo(@Res() res) {
    const data = renderKeyDefinitions();
    return res.json(data);
  }
}
