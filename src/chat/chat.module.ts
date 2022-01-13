import { Module, HttpModule } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { ChatController } from './chat.controller';
import { Chat } from './chat.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [HttpModule, TypegooseModule.forFeature([Chat])],
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
