export type UploadFileDto = {
  Folder?: string;
  OriginalName: string;
  MimeType: string;
  Content: Uint8Array;
  Size: number;
};
