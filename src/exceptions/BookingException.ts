import { HttpException, HttpStatus } from '@nestjs/common';

export class BookingException extends HttpException {
  constructor() {
    super('Forbidden', HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
