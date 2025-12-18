export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64 string
  size: number;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  CHAT = 'CHAT',
}
