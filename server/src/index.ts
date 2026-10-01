import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { connectDB, disconnectDB } from './db.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`TripSplit API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
