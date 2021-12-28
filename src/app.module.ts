import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { mongo } from './.config';
console.log(`mongodb://${mongo.user}:${mongo.pass}@${mongo.host}:${mongo.port}/${mongo.name}`)
@Module({
  imports: [
    TypegooseModule.forRoot(
      `mongodb://${mongo.user}:${mongo.pass}@${mongo.host}:${mongo.port}/${mongo.name}?retryWrites=true&w=majority`
    ),
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
