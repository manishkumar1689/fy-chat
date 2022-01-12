import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { CacheModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { mongo, redisOptions } from './.config';

@Module({
  imports: [
    TypegooseModule.forRoot(
      `mongodb://${mongo.user}:${mongo.pass}@${mongo.host}:${mongo.port}/${mongo.name}?retryWrites=true&w=majority`,
    ),
    ChatModule,
    CacheModule.register(redisOptions),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
