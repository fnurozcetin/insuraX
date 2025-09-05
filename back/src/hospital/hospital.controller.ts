import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { HospitalService, Hospital, HospitalServiceData } from './hospital.service';

@Controller('hospitals')
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  // Hospital Management Endpoints
  @Post()
  async createHospital(@Body() hospitalData: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const hospital = await this.hospitalService.createHospital(hospitalData);
      return {
        success: true,
        message: 'Hastane başarıyla oluşturuldu',
        data: hospital
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hastane oluşturulurken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getAllHospitals() {
    try {
      const hospitals = await this.hospitalService.getAllHospitals();
      return {
        success: true,
        data: hospitals
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hastaneler yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async getHospitalById(@Param('id') id: string) {
    try {
      const hospital = await this.hospitalService.getHospitalById(id);
      if (!hospital) {
        throw new HttpException(
          { success: false, message: 'Hastane bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        data: hospital
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane bilgileri yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  async updateHospital(@Param('id') id: string, @Body() updateData: Partial<Hospital>) {
    try {
      const hospital = await this.hospitalService.updateHospital(id, updateData);
      if (!hospital) {
        throw new HttpException(
          { success: false, message: 'Hastane bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        message: 'Hastane başarıyla güncellendi',
        data: hospital
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane güncellenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async deleteHospital(@Param('id') id: string) {
    try {
      const deleted = await this.hospitalService.deleteHospital(id);
      if (!deleted) {
        throw new HttpException(
          { success: false, message: 'Hastane bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        message: 'Hastane başarıyla silindi'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane silinirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Hospital Service Management Endpoints
  @Post('services')
  async createHospitalService(@Body() serviceData: Omit<HospitalServiceData, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const service = await this.hospitalService.createHospitalService(serviceData);
      return {
        success: true,
        message: 'Hastane hizmeti başarıyla oluşturuldu',
        data: service
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hastane hizmeti oluşturulurken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('services')
  async getAllHospitalServices() {
    try {
      const services = await this.hospitalService.getAllHospitalServices();
      return {
        success: true,
        data: services
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hastane hizmetleri yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('services/hospital/:hospitalId')
  async getHospitalServicesByHospitalId(@Param('hospitalId') hospitalId: string) {
    try {
      const services = await this.hospitalService.getHospitalServicesByHospitalId(hospitalId);
      return {
        success: true,
        data: services
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hastane hizmetleri yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('services/:id')
  async getHospitalServiceById(@Param('id') id: string) {
    try {
      const service = await this.hospitalService.getHospitalServiceById(id);
      if (!service) {
        throw new HttpException(
          { success: false, message: 'Hastane hizmeti bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        data: service
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane hizmeti bilgileri yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('services/:id')
  async updateHospitalService(@Param('id') id: string, @Body() updateData: Partial<HospitalServiceData>) {
    try {
      const service = await this.hospitalService.updateHospitalService(id, updateData);
      if (!service) {
        throw new HttpException(
          { success: false, message: 'Hastane hizmeti bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        message: 'Hastane hizmeti başarıyla güncellendi',
        data: service
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane hizmeti güncellenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('services/:id/use')
  async useHospitalService(@Param('id') id: string, @Body() body: { patientWallet: string }) {
    try {
      const result = await this.hospitalService.useHospitalService(id, body.patientWallet);
      return {
        success: result.success,
        message: result.message,
        data: { 
          remainingLimit: result.remainingLimit,
          usageId: result.usageId
        }
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Hizmet kullanılırken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('services/usage/:usageId/pay')
  async payServiceUsage(@Param('usageId') usageId: string) {
    try {
      const result = await this.hospitalService.payServiceUsage(usageId);
      return {
        success: result.success,
        message: result.success ? 'Ödeme başarıyla yapıldı' : 'Ödeme yapılamadı',
        error: result.error
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Ödeme yapılırken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('services/:id')
  async deleteHospitalService(@Param('id') id: string) {
    try {
      const deleted = await this.hospitalService.deleteHospitalService(id);
      if (!deleted) {
        throw new HttpException(
          { success: false, message: 'Hastane hizmeti bulunamadı' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        message: 'Hastane hizmeti başarıyla silindi'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Hastane hizmeti silinirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Statistics Endpoint
  @Get('statistics/overview')
  async getHospitalStatistics() {
    try {
      const statistics = await this.hospitalService.getHospitalStatistics();
      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'İstatistikler yüklenirken hata oluştu', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
