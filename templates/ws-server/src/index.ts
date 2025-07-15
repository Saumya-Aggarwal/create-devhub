import { WebSocketServer } from 'ws';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const wss = new WebSocketServer({
  port: PORT,
  perMessageDeflate: false,
});

console.log(`🔌 WebSocket server started on ws://localhost:${PORT}`);

wss.on('connection', function connection(ws, request) {
  const clientIp = request.socket.remoteAddress;
  console.log(`✅ New client connected from ${clientIp}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to WebSocket server!',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', function message(data) {
    const messageStr = data.toString();
    console.log('📨 Received:', messageStr);

    // Handle ping/pong
    if (messageStr.toLowerCase() === 'ping') {
      ws.send('pong');
      console.log('🏓 Sent pong response');
      return;
    }

    // Handle JSON messages
    if (messageStr.startsWith('{')) {
      try {
        const parsedMessage = JSON.parse(messageStr);
        console.log('📨 Parsed JSON:', parsedMessage);

        // Echo the message back to sender
        ws.send(JSON.stringify({
          type: 'echo',
          originalMessage: parsedMessage,
          timestamp: new Date().toISOString()
        }));

        // Broadcast to all other clients
        wss.clients.forEach(function each(client) {
          if (client !== ws && client.readyState === 1) { // OPEN state
            client.send(JSON.stringify({
              type: 'broadcast',
              message: parsedMessage,
              timestamp: new Date().toISOString()
            }));
          }
        });

      } catch (error) {
        console.error('❌ Error parsing JSON:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON format',
          timestamp: new Date().toISOString()
        }));
      }
    } else {
      // Handle simple text messages
      console.log('📝 Text message:', messageStr);
      
      // Echo back with confirmation
      ws.send(`Echo: ${messageStr}`);
      
      // Broadcast to all other clients
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === 1) { // OPEN state
          client.send(`User says: ${messageStr}`);
        }
      });
    }
  });

  // Handle client disconnect
  ws.on('close', function close() {
    console.log(`❌ Client from ${clientIp} disconnected`);
  });

  // Handle errors
  ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err);
  });
});

// Handle server errors
wss.on('error', function error(err) {
  console.error('❌ WebSocket Server error:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
