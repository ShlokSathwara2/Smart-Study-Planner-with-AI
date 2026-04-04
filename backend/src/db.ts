import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed:', err);
    console.warn('⚠️  Will retry in background. API may have limited functionality.');
    // Don't exit - allow server to start anyway
    // Retry connection every 10 seconds in background
    setTimeout(() => connectDB().catch(() => {}), 10000);
    return false;
  }
};


 
