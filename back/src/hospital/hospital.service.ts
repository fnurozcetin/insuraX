import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface HospitalServiceData {
  id: string;
  name: string;
  type: 'muayene' | 'radyoloji' | 'mr' | 'laboratuvar' | 'ameliyat';
  limit: number;
  remainingLimit: number;
  price: number;
  hospitalWallet: string;
  hospitalName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  wallet: string;
  address: string;
  phone: string;
  email: string;
  services: HospitalServiceData[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class HospitalService {
  private readonly dataPath = join(process.cwd(), 'data', 'hospitals.json');

  constructor() {
    this.initializeDataFile();
  }

  private initializeDataFile() {
    if (!existsSync(this.dataPath)) {
      const initialData = {
        hospitals: [],
        services: []
      };
      writeFileSync(this.dataPath, JSON.stringify(initialData, null, 2));
    }
  }

  private readData(): { hospitals: Hospital[]; services: HospitalServiceData[] } {
    try {
      const data = readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { hospitals: [], services: [] };
    }
  }

  private writeData(data: { hospitals: Hospital[]; services: HospitalServiceData[] }) {
    writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
  }

  // Hospital Management
  async createHospital(hospitalData: Omit<Hospital, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hospital> {
    const data = this.readData();
    const hospital: Hospital = {
      ...hospitalData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    data.hospitals.push(hospital);
    this.writeData(data);
    return hospital;
  }

  async getAllHospitals(): Promise<Hospital[]> {
    const data = this.readData();
    return data.hospitals;
  }

  async getHospitalById(id: string): Promise<Hospital | null> {
    const data = this.readData();
    return data.hospitals.find(h => h.id === id) || null;
  }

  async updateHospital(id: string, updateData: Partial<Hospital>): Promise<Hospital | null> {
    const data = this.readData();
    const hospitalIndex = data.hospitals.findIndex(h => h.id === id);
    
    if (hospitalIndex === -1) return null;
    
    data.hospitals[hospitalIndex] = {
      ...data.hospitals[hospitalIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    this.writeData(data);
    return data.hospitals[hospitalIndex];
  }

  async deleteHospital(id: string): Promise<boolean> {
    const data = this.readData();
    const initialLength = data.hospitals.length;
    data.hospitals = data.hospitals.filter(h => h.id !== id);
    
    if (data.hospitals.length < initialLength) {
      this.writeData(data);
      return true;
    }
    return false;
  }

  // Hospital Service Management
  async createHospitalService(serviceData: Omit<HospitalServiceData, 'id' | 'createdAt' | 'updatedAt'>): Promise<HospitalServiceData> {
    const data = this.readData();
    const service: HospitalServiceData = {
      ...serviceData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Blockchain integration removed for now
    
    data.services.push(service);
    this.writeData(data);
    return service;
  }

  async getAllHospitalServices(): Promise<HospitalServiceData[]> {
    const data = this.readData();
    return data.services;
  }

  async getHospitalServicesByHospitalId(hospitalId: string): Promise<HospitalServiceData[]> {
    const data = this.readData();
    return data.services.filter(s => s.hospitalWallet === hospitalId);
  }

  async getHospitalServiceById(id: string): Promise<HospitalServiceData | null> {
    const data = this.readData();
    return data.services.find(s => s.id === id) || null;
  }

  async updateHospitalService(id: string, updateData: Partial<HospitalServiceData>): Promise<HospitalServiceData | null> {
    const data = this.readData();
    const serviceIndex = data.services.findIndex(s => s.id === id);
    
    if (serviceIndex === -1) return null;
    
    data.services[serviceIndex] = {
      ...data.services[serviceIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    this.writeData(data);
    return data.services[serviceIndex];
  }

  async useHospitalService(id: string, patientWallet: string): Promise<{ success: boolean; message: string; remainingLimit?: number; usageId?: string }> {
    const data = this.readData();
    const serviceIndex = data.services.findIndex(s => s.id === id);
    
    if (serviceIndex === -1) {
      return { success: false, message: 'Hizmet bulunamadı' };
    }
    
    const service = data.services[serviceIndex];
    
    if (service.remainingLimit <= 0) {
      return { success: false, message: 'Bu hizmet için limit dolmuş' };
    }
    
    // Blockchain integration removed for now
    
    // Decrease remaining limit
    service.remainingLimit -= 1;
    service.updatedAt = new Date().toISOString();
    
    data.services[serviceIndex] = service;
    this.writeData(data);
    
    return { 
      success: true, 
      message: 'Hizmet başarıyla kullanıldı', 
      remainingLimit: service.remainingLimit,
      usageId: "1"
    };
  }

  async deleteHospitalService(id: string): Promise<boolean> {
    const data = this.readData();
    const initialLength = data.services.length;
    data.services = data.services.filter(s => s.id !== id);
    
    if (data.services.length < initialLength) {
      this.writeData(data);
      return true;
    }
    return false;
  }

  // Statistics
  async payServiceUsage(usageId: string): Promise<{ success: boolean; error?: string }> {
    // Blockchain integration removed for now
    return { success: true };
  }

  async getHospitalStatistics(): Promise<{
    totalHospitals: number;
    totalServices: number;
    totalRevenue: number;
    activeServices: number;
  }> {
    const data = this.readData();
    const totalRevenue = data.services.reduce((sum, service) => {
      const usedLimit = service.limit - service.remainingLimit;
      return sum + (usedLimit * service.price);
    }, 0);
    
    const activeServices = data.services.filter(s => s.remainingLimit > 0).length;
    
    return {
      totalHospitals: data.hospitals.length,
      totalServices: data.services.length,
      totalRevenue,
      activeServices,
    };
  }
}
