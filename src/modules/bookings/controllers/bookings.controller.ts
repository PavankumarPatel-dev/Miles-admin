import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Paginate } from 'nestjs-paginate/lib/decorator';
import type { PaginateQuery } from 'nestjs-paginate/lib/decorator';
import { Serialize } from '../../../common/interceptors/serialize.interceptor';
import { CreateBookingDto } from '../dto/request/create-booking.dto';
import { BookingDetailDto } from '../dto/response/booking-detail.dto';
import { BookingDto } from '../dto/response/booking.dto';
import { UpdateBookingDto } from '../dto/request/update-booking.dto';
import { BookingsService } from '../services/bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @Serialize(BookingDto, { paginated: true })
  list(@Paginate() query: PaginateQuery) {
    return this.bookings.list(query);
  }

  @Post()
  @Serialize(BookingDto)
  create(@Body() input: CreateBookingDto) {
    return this.bookings.create(input);
  }

  @Get(':id')
  @Serialize(BookingDetailDto)
  detail(@Param('id') id: string) {
    return this.bookings.detail(id);
  }

  @Patch(':id')
  @Serialize(BookingDetailDto)
  update(@Param('id') id: string, @Body() input: UpdateBookingDto) {
    return this.bookings.update(id, input);
  }
}
