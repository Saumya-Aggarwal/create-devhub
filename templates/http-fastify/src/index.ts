import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const fastify = Fastify({
  logger: true // Simple logger instead of pino-pretty for now
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;

// Register plugins
await fastify.register(cors, {
  origin: true
});

await fastify.register(helmet);

// Routes
fastify.get('/', async (request, reply) => {
  return {
    message: '⚡ Fastify API Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
});

// API routes
fastify.get('/api/test', async (request, reply) => {
  return {
    message: '✅ API is working!',
    timestamp: new Date().toISOString(),
    method: 'GET',
    status: 'success'
  };
});

fastify.post('/api/test', async (request, reply) => {
  const body = request.body as any;
  return {
    message: '✅ POST request received!',
    receivedData: body,
    echo: body?.message || 'No message provided',
    timestamp: new Date().toISOString(),
    method: 'POST',
    status: 'success'
  };
});

fastify.get('/api/users', async (request, reply) => {
  return {
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]
  };
});

// Schema for POST validation
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' }
    }
  }
};

fastify.post('/api/users', {
  schema: createUserSchema
}, async (request, reply) => {
  const { name, email } = request.body as { name: string; email: string };

  const newUser = {
    id: Date.now(),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  reply.status(201);
  return {
    message: 'User created successfully',
    user: newUser
  };
});

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    reply.status(400);
    return {
      error: 'Validation error',
      details: error.validation,
      timestamp: new Date().toISOString()
    };
  }

  reply.status(500);
  return {
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  };
});

// 404 handler
fastify.setNotFoundHandler(async (request, reply) => {
  reply.status(404);
  return {
    error: 'Route not found',
    path: request.url,
    timestamp: new Date().toISOString()
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`⚡ Fastify server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down Fastify server...`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();
