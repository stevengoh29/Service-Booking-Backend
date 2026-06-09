import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from 'src/modules/customers/customers.module';
import { Business } from 'src/modules/businesses/entities/business.entity';
import { BusinessOperatingHours } from 'src/modules/availability/entities/business-operating-hours.entity';
import { BlockedTime } from 'src/modules/availability/entities/blocked-time.entity';
import { Reservation } from './entities/reservation.entity';
import { ReservationService } from './services/reservation.service';
import { ReservationCapacityService } from './services/reservation-capacity.service';
import { ReservationQueryService } from './services/reservation-query.service';
import { PublicReservationController } from './controllers/public-reservation.controller';
import { ReservationController } from './controllers/reservation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      Business,
      BusinessOperatingHours,
      BlockedTime,
    ]),
    CustomersModule,
  ],
  providers: [
    ReservationService,
    ReservationCapacityService,
    ReservationQueryService,
  ],
  controllers: [PublicReservationController, ReservationController],
  exports: [
    ReservationService,
    ReservationCapacityService,
    ReservationQueryService,
  ],
})
export class ReservationsModule {}
