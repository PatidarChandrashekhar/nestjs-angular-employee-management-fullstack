import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { User, UserDocument } from './schemas/user.schema';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return user;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.validateCredentials(email, password);
    return this.issueTokens(user);
  }

  async refresh(userId: string, presentedRefreshToken: string): Promise<TokenPair> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }
    const matches = await bcrypt.compare(presentedRefreshToken, user.refreshTokenHash);
    if (!matches) {
      // Reuse of a stale/rotated token — revoke to be safe.
      user.refreshTokenHash = null;
      await user.save();
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: Omit<AuthenticatedUser, 'userId'> & { sub: string } = {
      sub: user.id as string,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    // Rotate: store only the hash of the new refresh token, never the raw value.
    user.refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await user.save();

    return { accessToken, refreshToken };
  }

  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }
}
