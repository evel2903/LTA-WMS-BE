import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigService } from '@nestjs/config';
import { FILE_STORAGE, IFileStorage } from './Domain/Interfaces/IFileStorage';
import { UploadFileUseCase } from './Application/UseCases/UploadFileUseCase';
import { LocalFileStorage } from './Infrastructure/Storage/LocalFileStorage';
import { UploadConfig } from './Infrastructure/Config/UploadConfig';
import { FileUploadController } from './Presentation/Controllers/FileUploadController';

@Module({
  imports: [
    ConfigModule.forFeature(UploadConfig),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const max = configService.get<number>('Upload.MaxFileSize') ?? 5 * 1024 * 1024;
        return {
          storage: memoryStorage(),
          limits: { fileSize: max },
        };
      },
    }),
  ],
  controllers: [FileUploadController],
  providers: [
    { provide: FILE_STORAGE, useClass: LocalFileStorage },
    {
      provide: UploadFileUseCase,
      useFactory: (storage: IFileStorage) => new UploadFileUseCase(storage),
      inject: [FILE_STORAGE],
    },
  ],
})
export class FileUploadModule {}
