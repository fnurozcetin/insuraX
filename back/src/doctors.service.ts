import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface DoctorDto {
  firstName: string;
  lastName: string;
  hospital: string;
  wallet: string;
}

@Injectable()
export class DoctorsService {
  private dataFile = path.resolve(__dirname, '..', 'data', 'doctors.json');

  private async ensureDataFile() {
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      await fs.access(this.dataFile).catch(async () => {
        await fs.writeFile(this.dataFile, JSON.stringify([], null, 2), 'utf-8');
      });
    } catch (e) {
      throw new InternalServerErrorException('Unable to initialize data storage');
    }
  }

  private async readAll(): Promise<DoctorDto[]> {
    await this.ensureDataFile();
    const raw = await fs.readFile(this.dataFile, 'utf-8');
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // reset corrupt file
      await fs.writeFile(this.dataFile, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
  }

  private async writeAll(items: DoctorDto[]) {
    await fs.writeFile(this.dataFile, JSON.stringify(items, null, 2), 'utf-8');
  }

  async list(): Promise<DoctorDto[]> {
    return this.readAll();
  }

  async add(dto: DoctorDto): Promise<DoctorDto> {
    const errors: string[] = [];
    if (!dto.firstName?.trim()) errors.push('firstName required');
    if (!dto.lastName?.trim()) errors.push('lastName required');
    if (!dto.hospital?.trim()) errors.push('hospital required');
    if (!dto.wallet?.trim()) errors.push('wallet required');
    if (errors.length) {
      throw new InternalServerErrorException(errors.join(', '));
    }

    const all = await this.readAll();
    // prevent duplicates by wallet
    const exists = all.find((d) => d.wallet.toLowerCase() === dto.wallet.toLowerCase());
    if (exists) {
      return exists; // idempotent add by wallet
    }
    all.push(dto);
    await this.writeAll(all);
    return dto;
  }
}
