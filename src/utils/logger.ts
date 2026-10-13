import { Logger } from '@nestjs/common';

const logger = new Logger('AdminHub');

export const log = {
  info: (message: string) => logger.log(message),
  warn: (message: string) => logger.warn(message),
  error: (message: string) => logger.error(message),
  debug: (message: string) => logger.debug(message),
  verbose: (message: string) => logger.verbose(message),
  http: (message: string) => logger.log(message),
};
