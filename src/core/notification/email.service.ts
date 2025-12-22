import { Injectable } from '@nestjs/common';
import { INotificationService } from './notification.interface';
import { LoggerService } from '../logger/logger.service';
import { AwsSesService } from '../aws/aws-ses.service'; 

@Injectable()
export class EmailService implements INotificationService {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly awsSesService: AwsSesService,
  ) {}

  async sendWelcomeNotification(
    email: string,
    nickname: string,
  ): Promise<void> {
    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Sending welcome email to ${email}`,
    );

    // ✨ HTML 메일 내용 작성
    const subject = `[Coupang Eats] ${nickname}님 환영합니다!`;
    const htmlBody = `
      <div style="padding: 20px; border: 1px solid #ddd;">
        <h1>환영합니다, ${nickname}님!</h1>
        <p>성공적으로 회원가입이 완료되었습니다.</p>
        <p>이제 쿠팡이츠의 맛있는 서비스를 즐겨보세요.</p>
      </div>
    `;

    // ✨ 실제 전송 (Keyless)
    // 샌드박스 모드에서는 '수신자(email)'도 AWS 콘솔에서 검증된 이메일이어야 합니다.
    await this.awsSesService.sendEmail(email, subject, htmlBody);

    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Email sent successfully to ${email}`,
    );
  }
}
