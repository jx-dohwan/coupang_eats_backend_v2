import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { User } from '../../../../entities/user/user.entity';

export class SignUpBody {
  @IsString()
  email: User['email'];

  @IsString()
  password: User['password'];

  toEntity(hashedPassword: User['password']): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}
