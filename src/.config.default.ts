export const port = 3091;

export const socketIoPort = 5551;

export const globalApikey = '7iW_orjLptP';

export const sourcesDirectory = '/var/www/findingyou.co/sources';

export const ipWhitelist = ['0.0.0.0', '127.0.0.1'];

import * as redisStore from 'cache-manager-redis-store';

export const mongo = {
  name: 'findingyouchat',
  user: 'startrekker',
  pass: 'e2pYiAh9d_2Gn',
  port: '27017',
  host: 'localhost',
};

export const fyAPIBaseUri = 'http://localhost:3043';

export const redisOptions = {
  store: redisStore,
  host: 'localhost',
  port: 6379,
};

export const firebaseAccount = {
  type: 'service_account',
  project_id: '',
  private_key_id: '',
  private_key: '',
  client_email: 'findingyou-1ef9a@appspot.gserviceaccount.com',
  client_id: '104523399940914594048',
  auth_uri: '',
  token_uri: '',
  auth_provider_x509_cert_url: '',
  client_x509_cert_url: '',
};

export const firebaseDB = 'fir-auth-bd895';

export const firebaseDomain = 'firebaseio.com';
