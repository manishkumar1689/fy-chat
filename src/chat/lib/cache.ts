import * as Redis from 'ioredis';

export const extractFromRedisMap = (redisMap) => {
  let redis = null;
  if (redisMap instanceof Object) {
    for (const item of redisMap) {
      if (item instanceof Array && item.length > 1) {
        redis = item[1];
      }
      break;
    }
  }
  return redis;
};

export const extractFromRedisClient = async (
  client: Redis.Redis,
  key: string,
) => {
  let result = null;
  if (client instanceof Object) {
    const strVal = await client.get(key);
    if (strVal) {
      result = JSON.parse(strVal);
    }
  }
  return result;
};

export const storeInRedis = async (client: Redis.Redis, key: string, value) => {
  let result = false;
  if (client instanceof Object) {
    client.set(key, JSON.stringify(value));
    result = true;
  }
  return result;
};
