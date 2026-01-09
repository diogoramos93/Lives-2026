
import { StreamInfo } from './types';

// Fix: Adding missing required properties 'socketId' and 'startedAt' to comply with StreamInfo interface.
export const MOCK_STREAMS: StreamInfo[] = [
  {
    id: '1',
    socketId: 'mock-socket-1',
    title: 'Tocando Violão na Madrugada 🎸',
    viewerCount: 124,
    thumbnail: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=400&h=225&fit=crop',
    streamerName: 'Anônimo 422',
    tag: 'homem',
    startedAt: Date.now() - 3600000
  },
  {
    id: '2',
    socketId: 'mock-socket-2',
    title: 'Papo Furado & Relax 🍷',
    viewerCount: 89,
    thumbnail: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&h=225&fit=crop',
    streamerName: 'Anônimo 109',
    tag: 'mulher',
    startedAt: Date.now() - 1800000
  },
  {
    id: '3',
    socketId: 'mock-socket-3',
    title: 'Trans & Proud: Conversa Aberta',
    viewerCount: 45,
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=225&fit=crop',
    streamerName: 'Anônimo 877',
    tag: 'mulher_trans',
    startedAt: Date.now() - 900000
  },
  {
    id: '4',
    socketId: 'mock-socket-4',
    title: 'Gaming & Chill 🎮',
    viewerCount: 231,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop',
    streamerName: 'Anônimo 332',
    tag: 'homem',
    startedAt: Date.now() - 7200000
  }
];

// Lista de termos proibidos para o filtro local (expanda conforme necessário)
export const FORBIDDEN_WORDS = [
  'ofensa1', 
  'ofensa2', 
  'racismo', 
  'nazismo', 
  'cpflive', // Exemplo de spam comum
  'venda de conta'
];
