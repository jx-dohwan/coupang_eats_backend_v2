import { Injectable } from '@nestjs/common';
import { INotificationService } from './notification.interface';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EmailService implements INotificationService {
  constructor(private readonly loggerService: LoggerService) {}

  async sendWelcomeNotification(email: string, nickname: string): Promise<void> {
    // 1. 발송 시작 로그
    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Sending welcome email to ${email} (${nickname})`,
    );
    
    // 2. [시뮬레이션] 실제 발송 대신 0.1초 대기 (네트워크 지연 흉내)
    // 나중에 여기에 Nodemailer나 AWS SES 연동 코드가 들어갑니다.
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 3. 발송 완료 로그
    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Welcome email sent successfully to ${email}`,
    );
  }
}