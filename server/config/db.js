const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  const retryDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );
      if (attempt === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      console.log(`Retrying in ${retryDelay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

module.exports = connectDB;
