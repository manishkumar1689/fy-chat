import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { mongo } from './.config';

@Module({
  imports: [
    TypegooseModule.forRoot(
      `mongodb+srv://${mongo.user}:${mongo.pass}@localhost/${mongo.name}?retryWrites=true&w=majority`,
      {
        connectionName: 'fychat',
      },
    ),
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
