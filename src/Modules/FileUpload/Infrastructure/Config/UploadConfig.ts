import { registerAs } from '@nestjs/config';

export type UploadConfigValues = {
  Dir: string;
  MaxFileSize: number;
};

export const UploadConfig = registerAs('Upload', (): UploadConfigValues => {
  const max = Number(process.env.UPLOAD_MAX_FILE_SIZE ?? 5 * 1024 * 1024);
  return {
    Dir: process.env.UPLOAD_DIR ?? 'uploads',
    MaxFileSize: Number.isFinite(max) ? max : 5 * 1024 * 1024,
  };
});
