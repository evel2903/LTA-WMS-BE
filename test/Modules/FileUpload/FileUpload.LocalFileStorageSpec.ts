import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LocalFileStorage } from '../../../src/Modules/FileUpload/Infrastructure/Storage/LocalFileStorage';

describe('LocalFileStorage', () => {
  const tmpRoot = path.join(__dirname, '.tmp', 'uploads');

  beforeEach(() => {
    fs.rmSync(path.join(__dirname, '.tmp'), { recursive: true, force: true });
  });

  afterAll(() => {
    fs.rmSync(path.join(__dirname, '.tmp'), { recursive: true, force: true });
  });

  it('writes file to configured directory and returns relative path', async () => {
    const configService = {
      get: (key: string) => (key === 'Upload.Dir' ? tmpRoot : undefined),
    } as unknown as ConfigService;

    const storage = new LocalFileStorage(configService);
    const result = await storage.Save({
      Folder: 'a/b',
      FileName: 'f.txt',
      Content: Buffer.from('hello'),
    });

    const fullPath = path.join(tmpRoot, 'a', 'b', 'f.txt');
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(result.RelativePath.replace(/\\/g, '/')).toBe(`${tmpRoot.replace(/\\/g, '/')}/a/b/f.txt`);
    expect(result.FileName).toBe('f.txt');
  });
});
