import { Expose, Transform, Type } from 'class-transformer';

class BookingUserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

function formatDuration(startAt: Date | string, endAt: Date | string) {
  const durationMinutes = Math.floor(
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000,
  );
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return null;

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export class BookingDto {
  @Expose()
  id: string;

  @Expose()
  bookingId: string;

  @Expose()
  service: string;

  @Expose()
  @Transform(({ obj }) => formatDuration(obj.startAt, obj.endAt), {
    toClassOnly: true,
  })
  duration: string | null;

  @Expose()
  status: string;

  @Expose()
  amount: string;

  @Expose()
  currency: string;

  @Expose()
  @Type(() => BookingUserDto)
  user?: BookingUserDto;
}
