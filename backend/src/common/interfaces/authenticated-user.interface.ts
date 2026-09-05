import { Role } from '../decorators/roles.decorator';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: Role[];
}
