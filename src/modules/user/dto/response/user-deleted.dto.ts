import { Expose } from 'class-transformer';

export class UserDeletedDto {
  @Expose()
  id: string;

  @Expose()
  deleted: boolean;
}
