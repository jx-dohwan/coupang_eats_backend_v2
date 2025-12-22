import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Configurations } from '../config';

@Injectable()
export class AwsSesService {
  private readonly sesClient: SESClient;
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService<Configurations>) {
    const region = this.configService.getOrThrow('AWS.REGION', { infer: true });

    // AWS IAM Role(Keyless) 인증 사용
    this.sesClient = new SESClient({ region });

    // 환경변수에서 발신자 이메일 가져오기 (설정 파일에 추가 필요)
    this.senderEmail = this.configService.getOrThrow('AWS.SES_SENDER_EMAIL', {
      infer: true,
    });
  }

  /**
   * 이메일 발송 메서드
   * @param to 수신자 이메일
   * @param subject 제목
   * @param htmlBody 본문 (HTML)
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: this.senderEmail, // 검증된 발신자 주소
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);
    } catch (error) {
      console.error('SES Error:', error);
      throw new InternalServerErrorException(
        '메일 발송 중 오류가 발생했습니다.',
      );
    }
  }
}
