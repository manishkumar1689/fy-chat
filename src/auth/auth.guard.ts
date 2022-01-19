import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { globalApikey } from '../.config';
import { maySkipValidation } from './auth.utils';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (maySkipValidation(request)) {
      return true;
    } else {
      return this.matchApiKey(request.headers);
    }
  }

  matchApiKey(headers) {
    let valid = false;
    if (headers instanceof Object) {
      const { apikey } = headers;
      valid = apikey === globalApikey;
    }
    return valid;
  }
}
