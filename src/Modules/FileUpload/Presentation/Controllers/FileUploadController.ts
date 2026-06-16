import { Controller, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFileUseCase } from '../../Application/UseCases/UploadFileUseCase';
import { UploadQuery } from '../Requests/UploadQuery';

@Controller('files')
export class FileUploadController {
  constructor(private readonly uploadFileUseCase: UploadFileUseCase) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  public async Upload(@UploadedFile() file: Express.Multer.File, @Query() query: UploadQuery) {
    return await this.uploadFileUseCase.Execute({
      Folder: query.Folder,
      OriginalName: file.originalname,
      MimeType: file.mimetype,
      Content: file.buffer,
      Size: file.size,
    });
  }
}
