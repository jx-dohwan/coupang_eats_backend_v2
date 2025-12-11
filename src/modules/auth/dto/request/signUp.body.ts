import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { User } from '../../../../entities/user/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpBody {
  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  @IsString()
  email: User['email'];

  @ApiProperty({
    description: '비밀번호',
    example: 'password1234!',
  })
  @IsString()
  password: User['password'];

  toEntity(hashedPassword: User['password']): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}
