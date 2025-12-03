import { HttpStatus, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v7 as uuidv7 } from 'uuid';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || uuidv7();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const delay = Date.now() - start;
      const message = `${method} ${originalUrl} ${statusCode} - ${delay}ms`;

      // LoggerService의 메서드 사용 (context, object, message 순서)
      if (statusCode >= 500) {
        this.logger.error('HTTP', message, requestId);
      } else if (statusCode >= 400) {
        this.logger.warn('HTTP', message, requestId);
      } else {
        this.logger.info('HTTP', message, requestId);
      }
    });
    next();
  }
}
