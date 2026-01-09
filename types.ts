
export enum AppTab {
  HOME = 'home',
  RANDOM = 'random',
  LIVE = 'live'
}

export type IdentityTag = 'homem' | 'mulher' | 'trans';

export interface UserPreferences {
  myIdentity: IdentityTag | null;
  lookingFor: IdentityTag[];
}

export interface StreamInfo {
  id: string; // Peer ID do streamer
  socketId: string;
  title: string;
  viewerCount: number;
  thumbnail?: string;
  streamerName: string;
  tag: IdentityTag;
  startedAt: number;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp?: number;
}
