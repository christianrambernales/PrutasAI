const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[PrutasAI] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[PrutasAI] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
