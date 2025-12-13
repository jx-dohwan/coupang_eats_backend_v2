import { plainToInstance } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';
import { User } from '../../../../entities/user/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../../entities/user/user.interface';

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

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({
    description: '유저 역할 (Client, Owner, Delivery)',
    enum: Role,
    example: Role.CLIENT,
  })
  @IsEnum(Role)
  role: Role;

  toEntity(hashedPassword: User['password']): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}
