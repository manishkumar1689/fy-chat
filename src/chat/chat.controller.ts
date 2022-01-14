import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { ChatService } from './chat.service';
import { renderKeyDefinitions } from './settings/keys';

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

  @Get('unique-users/:userID')
  async getUniqueIds(@Res() res, @Param('userID') userID = '') {
    const validId = isValidObjectId(userID);
    const result = validId
      ? await this.chatService.getUniqueFromAndToInfo(userID)
      : { valid: false, fromIds: [], toIds: [] };
    return res.json(result);
  }

  @Get('chat-history/:from/:to')
  async getChatHistory(
    @Res() res,
    @Param('from') from = '',
    @Param('to') to = '',
  ) {
    const validIds = isValidObjectId(from) && isValidObjectId(to);
    let result: any = { valid: false };
    if (validIds) {
      result = await this.chatService.fetchConversation(from, to);
    }
    return res.json(result);
  }

  @Get('keys')
  async getKeys(@Res() res) {
    const data = renderKeyDefinitions();
    return res.json(data);
  }
}
