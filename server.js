
const io = require('socket.io')(3000, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  }
});

/**
 * MOTOR MAISJOB - VERSÃO TURBO 2026
 * Gerencia Random Chat (1v1) e Live Streaming (1vN)
 */

let usersInQueue = []; 
let activeStreams = []; 

console.log("------------------------------------------");
console.log("🚀 MOTOR MAISJOB LIVEFLOW ONLINE");
console.log("📍 Modo: Conexão Agressiva (Sem Limite de Repetição)");
console.log("------------------------------------------");

io.on('connection', (socket) => {
  io.emit('online_stats', io.engine.clientsCount);

  // ==========================================
  // LOGICA: CHAT RANDOM (1v1)
  // ==========================================
  
  socket.on('join_queue', (userData) => {
    // Limpa fila anterior para evitar bugs
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
    
    const newUser = {
      socketId: socket.id,
      peerId: userData.peerId,
      identity: userData.identity,
      lookingFor: userData.lookingFor
    };

    // Busca parceiro compatível (Sem restrição de 'lastPartner')
    const partnerIndex = usersInQueue.findIndex(u => {
      const iMatchPartner = (newUser.lookingFor.length === 0 || newUser.lookingFor.includes(u.identity));
      const partnerMatchesMe = (u.lookingFor.length === 0 || u.lookingFor.includes(newUser.identity));
      const notSamePerson = u.socketId !== socket.id;
      
      return notSamePerson && iMatchPartner && partnerMatchesMe;
    });

    if (partnerIndex !== -1) {
      const partner = usersInQueue.splice(partnerIndex, 1)[0];
      const roomId = `room_${socket.id}_${partner.socketId}`;
      
      socket.join(roomId);
      // Notifica ambos simultaneamente
      io.to(partner.socketId).emit('match_found', { peerId: newUser.peerId, partnerInfo: newUser });
      socket.emit('match_found', { peerId: partner.peerId, partnerInfo: partner });
      
      socket.currentRoom = roomId;
      console.log(`[Random] Match: ${newUser.identity} <-> ${partner.identity}`);
    } else {
      usersInQueue.push(newUser);
    }
  });

  socket.on('send_random_message', (text) => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('receive_random_message', text);
    }
  });

  socket.on('leave_match', () => {
    if (socket.currentRoom) {
      // Notifica o parceiro para ele buscar outro automaticamente
      socket.to(socket.currentRoom).emit('partner_disconnected');
      socket.leave(socket.currentRoom);
      socket.currentRoom = null;
    }
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
  });

  // ==========================================
  // LOGICA: LIVE STREAMING (1vN)
  // ==========================================

  socket.on('start_stream', (data) => {
    activeStreams = activeStreams.filter(s => s.socketId !== socket.id);
    const newStream = {
      ...data,
      socketId: socket.id,
      viewerCount: 0,
      startedAt: Date.now()
    };
    activeStreams.push(newStream);
    io.emit('active_streams', activeStreams);
    console.log(`[Live] Nova transmissão de: ${newStream.tag}`);
  });

  socket.on('join_live_room', (streamId) => {
    const roomName = `live_${streamId}`;
    socket.join(roomName);
    const stream = activeStreams.find(s => s.id === streamId);
    if (stream) {
      const room = io.sockets.adapter.rooms.get(roomName);
      stream.viewerCount = room ? room.size : 1;
      io.emit('active_streams', activeStreams);
    }
  });

  socket.on('send_live_message', (data) => {
    io.to(`live_${data.roomId}`).emit('receive_live_message', {
      id: Date.now().toString(),
      user: 'Espectador',
      text: data.text,
      timestamp: Date.now()
    });
  });

  socket.on('stop_stream', () => {
    const stream = activeStreams.find(s => s.socketId === socket.id);
    if (stream) {
      io.to(`live_${stream.id}`).emit('stream_ended', stream.id);
      activeStreams = activeStreams.filter(s => s.socketId !== socket.id);
      io.emit('active_streams', activeStreams);
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('partner_disconnected');
    }
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
    
    const stream = activeStreams.find(s => s.socketId === socket.id);
    if (stream) {
      io.to(`live_${stream.id}`).emit('stream_ended', stream.id);
      activeStreams = activeStreams.filter(s => s.socketId !== socket.id);
    }
    io.emit('active_streams', activeStreams);
    io.emit('online_stats', io.engine.clientsCount);
  });
});
