import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';

import { ipWhitelist, sourcesDirectory } from '../.config';
import { notEmptyString } from '../chat/lib/helpers';

const readRawFile = (fileName = '') => {
  const relPath = sourcesDirectory + '/' + fileName;
  const normalisedPath = path.resolve(relPath);
  let out = '';
  if (fs.existsSync(normalisedPath)) {
    if (fs.lstatSync(normalisedPath).isDirectory() === false) {
      const buffer = fs.readFileSync(normalisedPath);
      out = buffer.toString();
    }
  }
  return out;
};

export const ipWhitelistFileData = () => {
  const ipWhitelistFileContent = readRawFile('ip-whitelist.txt');
  let extraIps: string[] = [];
  if (notEmptyString(ipWhitelistFileContent)) {
    const ipRgx = /^\d+\.\d+\.\d+\.\d+$/;
    extraIps = ipWhitelistFileContent
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) => ipRgx.test(line) && ipWhitelist.includes(line) === false,
      );
  }
  return extraIps;
};

export const fetchIpWhitelist = () => {
  const extraIps = ipWhitelistFileData();
  return [...ipWhitelist, ...extraIps];
};

export const maySkipValidation = (request: Request): boolean => {
  const { headers } = request;
  const ip = Object.keys(headers).includes('x-real-ip')
    ? headers['x-real-ip'].toString()
    : '0.0.0.0';
  const ipOverrides = fetchIpWhitelist();
  return ipOverrides.includes(ip);
};
