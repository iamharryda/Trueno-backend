import mongoose from 'mongoose';
import logger from './src/core/config/logger.js'; 
import { app, server} from './src/app.js'; 
import { mongoURI, port } from './src/core/config/config.js';


mongoose
  .connect(mongoURI)
  .then(() => {
    logger.info('MongoDB connected');
    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
  });

