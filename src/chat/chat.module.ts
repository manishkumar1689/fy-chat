import { Module, HttpModule } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { Chat } from './chat.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [HttpModule, TypegooseModule.forFeature([Chat])],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
