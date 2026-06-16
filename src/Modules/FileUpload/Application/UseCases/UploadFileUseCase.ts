import { randomUUID } from 'crypto';
import { IFileStorage } from '../../Domain/Interfaces/IFileStorage';
import { UploadFileDto } from '../DTOs/UploadFileDto';
import { UploadFileResultDto } from '../DTOs/UploadFileResultDto';

const SafeFolder = (folder: string | undefined): string => {
  if (!folder) return '';
  const cleaned = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
  return cleaned.replace(/^\/+/, '').replace(/\.\./g, '');
};

const GetExtension = (originalName: string): string => {
  const trimmed = (originalName ?? '').trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) return '';
  const ext = trimmed.slice(lastDot);
  if (!/^\.[a-zA-Z0-9]{1,10}$/.test(ext)) return '';
  return ext.toLowerCase();
};

export class UploadFileUseCase {
  constructor(private readonly fileStorage: IFileStorage) {}

  public async Execute(request: UploadFileDto): Promise<UploadFileResultDto> {
    const folder = SafeFolder(request.Folder);
    const extension = GetExtension(request.OriginalName);
    const fileName = `${randomUUID()}${extension}`;

    const saved = await this.fileStorage.Save({
      Folder: folder,
      FileName: fileName,
      Content: request.Content,
    });

    return {
      FileName: saved.FileName,
      OriginalName: request.OriginalName,
      MimeType: request.MimeType,
      Size: request.Size,
      Path: saved.RelativePath,
    };
  }
}
