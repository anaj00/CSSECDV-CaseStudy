import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// MongoDB Atlas optimized connection options
const options = {
  serverSelectionTimeoutMS: 10000, // Increased for Atlas
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
};

let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

/**
 * Function to connect using Mongoose for NextAuth and general database operations.
 * Optimized for MongoDB Atlas with proper connection pooling and error handling.
 *
 * @returns {Promise<mongoose.Connection>} The mongoose connection object
 */
export async function connectToDatabase() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState >= 1) {
      console.log('Already connected to MongoDB Atlas');
      return mongoose.connection;
    }

    // Use cached promise if available
    if (cached.promise) {
      console.log('Using cached MongoDB connection promise');
      return cached.promise;
    }

    console.log('Connecting to MongoDB Atlas...');
    
    // Create new connection promise
    cached.promise = mongoose.connect(uri, options).then((mongoose) => {
      console.log('Connected to MongoDB Atlas successfully');
      return mongoose;
    });

    cached.conn = await cached.promise;
    return cached.conn;
    
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error.message);
    // Reset cached promise on error
    cached.promise = null;
    throw error;
  }
}

// For backwards compatibility and NextAuth
export default connectToDatabase;
