export class CreateHospitalServiceDto {
  name: string;
  type: 'muayene' | 'radyoloji' | 'mr' | 'laboratuvar' | 'ameliyat';
  limit: number;
  price: number;
  hospitalWallet: string;
  hospitalName: string;
}
