import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  avatarUrl: string | null;

  @Expose()
  phoneNumber: string | null;

  @Expose()
  dateOfBirth: string | null;

  @Expose()
  address: string | null;

  @Expose()
  role: string;

  @Expose()
  status: string;

  @Expose()
  isConfirmed: boolean;

  @Expose()
  isTwoFactorEnabled: boolean;

  @Expose()
  lastActiveAt: Date | null;

  @Expose()
  joiningDate: string;
}
