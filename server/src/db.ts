import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(uri?: string): Promise<string> {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{3,})@/, ':***@')}`);
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected successfully.');
      return mongoUri;
    } catch (err) {
      console.warn('Failed to connect to configured MONGODB_URI. Falling back to embedded MongoMemoryServer.', err);
    }
  }

  // Fallback to MongoMemoryServer for reliable, zero-config local run
  console.log('Initializing embedded MongoMemoryServer...');
  mongoMemoryServer = await MongoMemoryServer.create();
  const memoryUri = mongoMemoryServer.getUri();
  await mongoose.connect(memoryUri);
  console.log(`Embedded MongoMemoryServer connected successfully.`);
  return memoryUri;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}
