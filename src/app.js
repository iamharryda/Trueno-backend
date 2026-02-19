// import csurf from 'csurf';
// app.use(csurf({ cookie: true }));

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from "path";
import { fileURLToPath } from "url";


import logger from './core/config/logger.js';
import errorHandler from './core/middlewares/errorMiddleware.js';
import notFound from './core/middlewares/notFound.js';
import { globalLimiter } from './lib/limit.js';
import appRouter from './core/app/appRouter.js';

// socket import
import { createServer } from 'http';
import { Server } from 'socket.io';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set up security middleware
app.use(helmet());
app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
app.use(xssClean());
app.use(mongoSanitize());



// Socket IO setup
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});



// Set up logging middleware
app.use(morgan('combined'));

// Set up body parsing middleware
app.use(express.json({ limit: '10000kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up rate limiting middleware
app.use(globalLimiter);

// Set up static files middleware
const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

// Set up API routes
app.use('/api', appRouter);



// Socket IO connection
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // Join a room for chat
  socket.on("joinRoom", (room) => {
    socket.join(`room-${room}`);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  // Leave a chat room
  socket.on("leaveRoom", (room) => {
    socket.leave(`room-${room}`);
    console.log(`Client ${socket.id} left room: ${room}`);
  });

  // Register user for notifications
  socket.on("registerUser", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room: user-${userId}`);
  });

  // Join ride chat room
  socket.on("joinRideChat", (rideId) => {
    socket.join(`ride-${rideId}`);
    console.log(`Client ${socket.id} joined ride chat: ${rideId}`);
  });

  // Leave ride chat room
  socket.on("leaveRideChat", (rideId) => {
    socket.leave(`ride-${rideId}`);
    console.log(`Client ${socket.id} left ride chat: ${rideId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});



// Set up 404 error middleware
app.use(notFound);

// Set up error handling middleware
app.use(errorHandler);

logger.info('Middleware stack initialized');

export  { server, app }; 


