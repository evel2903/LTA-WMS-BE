import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IFileStorage, SaveFileRequest, SaveFileResult } from '../../Domain/Interfaces/IFileStorage';

@Injectable()
export class LocalFileStorage implements IFileStorage {
  constructor(private readonly configService: ConfigService) {}

  public async Save(request: SaveFileRequest): Promise<SaveFileResult> {
    const baseDir = this.configService.get<string>('Upload.Dir') ?? 'uploads';
    const destDir = path.join(baseDir, request.Folder ?? '');
    fs.mkdirSync(destDir, { recursive: true });

    const fullPath = path.join(destDir, request.FileName);
    await fs.promises.writeFile(fullPath, request.Content);

    const relativePath = path.join(baseDir, request.Folder ?? '', request.FileName).replace(/\\/g, '/');
    return { RelativePath: relativePath, FileName: request.FileName };
  }
}
