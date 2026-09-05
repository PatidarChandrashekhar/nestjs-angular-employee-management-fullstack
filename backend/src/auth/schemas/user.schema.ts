import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/decorators/roles.decorator';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  // Never returned in API responses — stripped by the global
  // ClassSerializerInterceptor via @Exclude().
  @Exclude()
  @Prop({ required: true })
  passwordHash: string;

  @Exclude()
  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: [String], enum: ['admin', 'hr', 'employee'], default: ['employee'] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
