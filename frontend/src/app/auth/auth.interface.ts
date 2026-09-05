export type Role = 'admin' | 'hr' | 'employee';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
  exp: number;
}
