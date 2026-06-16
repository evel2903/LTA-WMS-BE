export type SaveFileRequest = {
  Folder: string;
  FileName: string;
  Content: Uint8Array;
};

export type SaveFileResult = {
  RelativePath: string;
  FileName: string;
};

export const FILE_STORAGE = Symbol('IFileStorage');

export interface IFileStorage {
  Save(request: SaveFileRequest): Promise<SaveFileResult>;
}
