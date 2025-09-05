import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { HospitalController } from './hospital/hospital.controller';
import { HospitalService } from './hospital/hospital.service';

@Module({
  imports: [],
  controllers: [AppController, DoctorsController, HospitalController],
  providers: [AppService, DoctorsService, HospitalService],
})
export class AppModule {}
