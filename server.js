
const io = require('socket.io')(3000, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket'],
  allowEIO3: true
});

/**
 * MOTOR MAISJOB - VERSÃO FOCUS 1V1
 * Especializado em Random Chat de Alta Velocidade
 */

let usersInQueue = []; 

console.log("------------------------------------------");
console.log("🚀 MOTOR MAISJOB 1V1 ONLINE");
console.log("📍 Foco: Matchmaking Instantâneo");
console.log("------------------------------------------");

io.on('connection', (socket) => {
  // Envia contagem global na conexão
  io.emit('online_stats', io.engine.clientsCount);

  socket.on('join_queue', (userData) => {
    // Remove qualquer entrada antiga para evitar duplicidade
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
    
    const newUser = {
      socketId: socket.id,
      peerId: userData.peerId,
      identity: userData.identity,
      lookingFor: userData.lookingFor
    };

    // Tenta encontrar parceiro compatível
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
      // Notificação simultânea
      io.to(partner.socketId).emit('match_found', { peerId: newUser.peerId, partnerInfo: newUser });
      socket.emit('match_found', { peerId: partner.peerId, partnerInfo: partner });
      
      socket.currentRoom = roomId;
      console.log(`[Match] ${newUser.identity} <-> ${partner.identity}`);
    } else {
      usersInQueue.push(newUser);
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

  socket.on('send_random_message', (text) => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('receive_random_message', text);
    }
  });

  socket.on('disconnect', () => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('partner_disconnected');
    }
    usersInQueue = usersInQueue.filter(u => u.socketId !== socket.id);
    io.emit('online_stats', io.engine.clientsCount);
  });
});
