import { Body, Controller, Get, Post } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import type { DoctorDto } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async list() {
    return this.doctorsService.list();
  }

  @Post()
  async add(@Body() body: DoctorDto) {
    return this.doctorsService.add(body);
  }
}
 