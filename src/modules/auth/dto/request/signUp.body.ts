import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { User } from '../../../../entities/user/user.entity';

export class SignUpBody {
  @IsString()
  email: User['email'];

  @IsString()
  name: User['name'];

  @IsString()
  password: User['password'];

  toEntity(hashedPassword: string): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}
