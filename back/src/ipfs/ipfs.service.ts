import { Injectable, OnModuleInit } from '@nestjs/common';
import { create } from 'ipfs-http-client';
import { ConfigService } from '@nestjs/config';

export interface IPFSUploadResult {
  path: string;
  cid: string;
  size: number;
}

@Injectable()
export class IpfsService implements OnModuleInit {
  private client: ReturnType<typeof create>;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const ipfsNodeUrl = this.configService.get<string>('IPFS_NODE_URL', 'https://ipfs.infura.io:5001');
    this.client = create({ url: ipfsNodeUrl });
  }

  async uploadFile(buffer: Buffer): Promise<IPFSUploadResult> {
    try {
      const result = await this.client.add(buffer);
      return {
        path: result.path,
        cid: result.cid.toString(),
        size: result.size
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJson(data: any): Promise<IPFSUploadResult> {
    try {
      const jsonString = JSON.stringify(data);
      const buffer = Buffer.from(jsonString);
      return this.uploadFile(buffer);
    } catch (error) {
      console.error('JSON to IPFS upload error:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  async getFile(cid: string): Promise<Buffer> {
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('IPFS get file error:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  async getJson<T>(cid: string): Promise<T> {
    try {
      const file = await this.getFile(cid);
      return JSON.parse(file.toString());
    } catch (error) {
      console.error('IPFS get JSON error:', error);
      throw new Error('Failed to parse IPFS content as JSON');
    }
  }

  async pinFile(cid: string): Promise<void> {
    try {
      await this.client.pin.add(cid);
    } catch (error) {
      console.error('IPFS pin error:', error);
      throw new Error('Failed to pin file on IPFS');
    }
  }
}
