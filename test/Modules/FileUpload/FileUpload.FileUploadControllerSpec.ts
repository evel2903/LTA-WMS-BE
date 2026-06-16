import { FileUploadController } from '../../../src/Modules/FileUpload/Presentation/Controllers/FileUploadController';
import { UploadFileUseCase } from '../../../src/Modules/FileUpload/Application/UseCases/UploadFileUseCase';

describe('FileUploadController', () => {
  it('maps multer file + query to use case dto', async () => {
    const execute = jest.fn();
    const useCase = { Execute: execute } as unknown as UploadFileUseCase;
    const controller = new FileUploadController(useCase);

    execute.mockResolvedValue({ Ok: true });

    const file = {
      originalname: 'a.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('x'),
      size: 1,
    } as unknown as Express.Multer.File;

    await expect(controller.Upload(file, { Folder: 'a/b' })).resolves.toEqual({ Ok: true });

    expect(execute).toHaveBeenCalledWith({
      Folder: 'a/b',
      OriginalName: 'a.txt',
      MimeType: 'text/plain',
      Content: Buffer.from('x'),
      Size: 1,
    });
  });
});
