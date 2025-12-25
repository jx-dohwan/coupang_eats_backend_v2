export class MockAwsSesService {
    async sendEmail(to: string, subject: string, content: string) {
      console.log(`[Mock-SES] Email sent to ${to}`);
      return true;
    }
  }
  
  export class MockAwsS3Service {
    async uploadFile(file: any) {
      return 'https://mock-s3-url.com/image.jpg';
    }
  }