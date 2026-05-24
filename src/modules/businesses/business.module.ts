import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BusinessesController } from './business.controller';
import { BusinessesService } from './business.service';
import { Business } from './entities/business.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Business])],
    controllers: [BusinessesController],
    providers: [BusinessesService],
    exports: [BusinessesService],
})
export class BusinessesModule { }