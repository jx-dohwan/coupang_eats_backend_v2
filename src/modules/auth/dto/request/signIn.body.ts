import { IsString } from 'class-validator';
import { User } from '../../../../entities/user/user.entity';

export class SignInBody {
  @IsString()
  email: User['email'];

  @IsString()
  password: User['password'];
}
