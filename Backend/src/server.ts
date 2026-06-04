import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './config';
import { errorlogger, logger } from './shared/logger';
import pool from './utils/dbClient';
import redisClient from './utils/redisClient';

// Global socket instance for emitting events
export let io: SocketIOServer;

async function bootstrap() {
  try {
    // Test database connection with retry mechanism
    logger.info('🔍 Testing database connection...');
    logger.info(`   Host: ${config.db.host}:${config.db.port}`);
    logger.info(`   Database: ${config.db.database}`);
    
    const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || '3');
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`   Attempt ${attempt}/${maxRetries}...`);
        const client = await Promise.race([
          pool.connect(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
          )
        ]);
        logger.info('✅ Database connected successfully');
        client.release();
        break;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '2000');
          logger.warn(`   ⚠️  Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
          logger.warn(`   Error: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }

    // Test Redis connection (non-blocking — server starts even if Redis is down)
    logger.info('🔍 Testing Redis connection...');
    try {
      await Promise.race([
        redisClient.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 6000)
        ),
      ]);
      if (redisClient.isReady()) {
        logger.info('✅ Redis connected successfully');
      } else {
        logger.warn('⚠️  Redis not available - continuing without Redis');
      }
    } catch (redisError) {
      logger.warn('⚠️  Redis not available - continuing without Redis');
      logger.warn(`   ${(redisError as Error).message}`);
    }
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Connection failed:', err);
    logger.error('');
    logger.error('🔧 Troubleshooting steps:');
    logger.error('   1. Check if the database server is running');
    logger.error('   2. Verify your IP is whitelisted on the database server');
    logger.error('   3. Check if VPN is required to access the database');
    logger.error('   4. Verify firewall rules allow outbound connections to port 5432');
    logger.error('   5. Test connectivity: Test-NetConnection -ComputerName 188.166.232.67 -Port 5432');
    logger.error('');
    logger.error(`   Current config: ${config.db.host}:${config.db.port}/${config.db.database}`);
    logger.error('');
    
    // In development, allow server to start without DB (optional)
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_START_WITHOUT_DB === 'true') {
      logger.warn('⚠️  Starting server without database connection (development mode)');
    } else {
      logger.error('❌ Exiting due to database connection failure');
      process.exit(1);
    }
  }

  const server: Server = app.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
  });

  // Initialize Socket.IO
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`✅ Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.IO initialized');


  const exitHandler = async () => {
    if (server) {
      server.close(async () => {
        logger.info('Server closed');
        // Close Redis connection
        await redisClient.disconnect();
        logger.info('Redis disconnected');
      });
    }
    process.exit(1);
  };

  const unexpectedErrorHandler = (error: unknown) => {
    errorlogger.error(error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    logger.info('SIGTERM received');
    if (server) {
      server.close();
    }
  });
}

bootstrap();
