
const io = require('socket.io')(3000, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Estado global do servidor
let usersInQueue = []; // { socketId, peerId, identity, lookingFor, lastPartnerId }
let activeStreams = []; // { id, socketId, title, viewerCount, streamerName, tag, startedAt }

console.log("Motor LiveFlow rodando na porta 3000...");

io.on('connection', (socket) => {
  // Envia estatísticas iniciais
  io.emit('online_stats', io.engine.clientsCount);

  // --- LÓGICA DE RANDOM CHAT ---

  socket.on('join_queue', (userData) => {
    // Remove se já estiver na fila
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);

    const newUser = {
      socketId: socket.id,
      peerId: userData.peerId,
      identity: userData.identity,
      lookingFor: userData.lookingFor,
      lastPartnerId: socket.lastPartnerId || null
    };

    // Tenta encontrar um match
    const partnerIndex = usersInQueue.findIndex(u => {
      // Regras de Match:
      // 1. Não ser o próprio usuário
      // 2. Não ser o último parceiro (evita repetir logo após o skip)
      // 3. Preferências batem (simplificado: se lookingFor estiver vazio, aceita qualquer um)
      const matchesPreferences = (newUser.lookingFor.length === 0 || newUser.lookingFor.includes(u.identity)) &&
                                 (u.lookingFor.length === 0 || u.lookingFor.includes(newUser.identity));
      
      return u.socketId !== socket.id && u.socketId !== newUser.lastPartnerId && matchesPreferences;
    });

    if (partnerIndex !== -1) {
      const partner = usersInQueue.splice(partnerIndex, 1)[0];
      const roomId = `room_${socket.id}_${partner.socketId}`;

      socket.join(roomId);
      io.to(partner.socketId).emit('match_found', { peerId: newUser.peerId, partnerInfo: newUser });
      socket.emit('match_found', { peerId: partner.peerId, partnerInfo: partner });

      socket.currentRoom = roomId;
      partner.socketId.currentRoom = roomId;
      
      // Armazena o último parceiro para evitar repetição imediata no skip
      socket.lastPartnerId = partner.socketId;
      io.to(partner.socketId).emit('partner_id', socket.id); 
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
      socket.to(socket.currentRoom).emit('partner_disconnected');
      socket.leave(socket.currentRoom);
      socket.currentRoom = null;
    }
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
  });

  // --- LÓGICA DE LIVES ---

  socket.on('start_stream', (data) => {
    const newStream = {
      ...data,
      socketId: socket.id,
      viewerCount: 0,
      startedAt: Date.now()
    };
    activeStreams.push(newStream);
    io.emit('active_streams', activeStreams);
  });

  socket.on('join_live_room', (streamId) => {
    socket.join(`live_${streamId}`);
    const stream = activeStreams.find(s => s.id === streamId);
    if (stream) {
      stream.viewerCount++;
      io.emit('active_streams', activeStreams);
    }
  });

  socket.on('send_live_message', (data) => {
    socket.to(`live_${data.roomId}`).emit('receive_live_message', {
      id: Date.now().toString(),
      user: 'Espectador',
      text: data.text
    });
  });

  socket.on('stop_stream', () => {
    activeStreams = activeStreams.filter(s => s.socketId !== socket.id);
    io.emit('active_streams', activeStreams);
  });

  socket.on('disconnect', () => {
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
    activeStreams = activeStreams.filter(s => s.socketId !== socket.id);
    io.emit('active_streams', activeStreams);
    io.emit('online_stats', io.engine.clientsCount);
  });
});
