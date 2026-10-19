import mongoose from 'mongoose';

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
  console.log('MongoDB connected');
  return mongoose.connection;
}
export { connectDB };