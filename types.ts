
export enum AppTab {
  HOME = 'home',
  RANDOM = 'random'
}

export type IdentityTag = 'homem' | 'mulher' | 'trans';

export interface UserPreferences {
  myIdentity: IdentityTag | null;
  lookingFor: IdentityTag[];
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp?: number;
}

// Added StreamInfo interface to support Live streaming features
export interface StreamInfo {
  id: string;
  socketId: string;
  title: string;
  viewerCount: number;
  thumbnail?: string;
  streamerName: string;
  tag: IdentityTag | string;
  startedAt: number;
}
