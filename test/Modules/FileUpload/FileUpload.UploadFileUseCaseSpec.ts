import { UploadFileUseCase } from '../../../src/Modules/FileUpload/Application/UseCases/UploadFileUseCase';
import {
  IFileStorage,
  SaveFileRequest,
  SaveFileResult,
} from '../../../src/Modules/FileUpload/Domain/Interfaces/IFileStorage';

class FakeFileStorage implements IFileStorage {
  public Save = jest.fn<Promise<SaveFileResult>, [SaveFileRequest]>();
}

describe('UploadFileUseCase', () => {
  it('sanitizes folder and uses safe extension', async () => {
    const storage = new FakeFileStorage();
    storage.Save.mockImplementation(async (req) => ({
      FileName: req.FileName,
      RelativePath: `${req.Folder}/${req.FileName}`,
    }));

    const useCase = new UploadFileUseCase(storage);
    const result = await useCase.Execute({
      Folder: '../..//a/..//b?x=1',
      OriginalName: 'photo.JPG',
      MimeType: 'image/jpeg',
      Content: Buffer.from('x'),
      Size: 1,
    });

    expect(storage.Save).toHaveBeenCalledTimes(1);
    const saved = storage.Save.mock.calls[0][0];
    expect(saved.Folder.startsWith('/')).toBe(false);
    expect(saved.Folder.includes('..')).toBe(false);
    expect(saved.Folder.includes('?')).toBe(false);
    expect(saved.FileName.endsWith('.jpg')).toBe(true);
    expect(result.Path.endsWith(saved.FileName)).toBe(true);
    expect(result.OriginalName).toBe('photo.JPG');
  });

  it('drops suspicious extension', async () => {
    const storage = new FakeFileStorage();
    storage.Save.mockImplementation(async (req) => ({
      FileName: req.FileName,
      RelativePath: `${req.Folder}/${req.FileName}`,
    }));

    const useCase = new UploadFileUseCase(storage);
    const result = await useCase.Execute({
      Folder: 'x',
      OriginalName: 'file.bad-ext-too-longgggg',
      MimeType: 'application/octet-stream',
      Content: Buffer.from('x'),
      Size: 1,
    });

    expect(result.FileName.includes('.')).toBe(false);
  });
});
