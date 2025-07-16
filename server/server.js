// server.js - Supports pagination + Logging with morgan & winston

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const helmet = require('helmet'); // Will be used in next step
const { createLogger, format, transports } = require('winston');

dotenv.config();

const connectDB = require('./db');
connectDB();

const app = express();
const server = http.createServer(app);

// Create Winston logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ level, message, timestamp }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Set up Morgan to log HTTP requests
const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev')); // Log to console during development

// Helmet for securing HTTP headers
app.use(helmet());

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// In-memory data
const users = {};
const messages = [];
const typingUsers = {};

function getUsersInRoom(room) {
  return Object.values(users).filter((u) => u.room === room);
}

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('user_join', ({ username, room }) => {
    users[socket.id] = { username, id: socket.id, room };
    socket.join(room);
    io.to(room).emit('user_list', getUsersInRoom(room));
    io.to(room).emit('user_joined', { username, id: socket.id });
  });

  socket.on('send_message', (messageData) => {
    const user = users[socket.id];
    const message = {
      ...messageData,
      id: Date.now(),
      sender: user?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      room: user.room,
      readBy: [socket.id],
    };
    messages.push(message);
    if (messages.length > 100) messages.shift();
    io.to(user.room).emit('receive_message', message);
  });

  socket.on('get_old_messages', ({ room, skip = 0, limit = 10 }) => {
    const roomMessages = messages
      .filter((m) => m.room === room)
      .sort((a, b) => b.id - a.id)
      .slice(skip, skip + limit)
      .reverse();
    socket.emit('old_messages', roomMessages);
  });

  socket.on('add_reaction', ({ messageId, emoji, username }) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      msg.reactions.push({ emoji, username });
      io.to(msg.room).emit('message_reaction', { messageId, emoji, username });
    }
  });

  socket.on('read_message', ({ messageId, userId }) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg && !msg.readBy.includes(userId)) {
      msg.readBy.push(userId);
      io.to(msg.room).emit('message_read', { messageId, userId });
    }
  });

  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (user) {
      typingUsers[socket.id] = isTyping ? user.username : undefined;
      io.to(user.room).emit('typing_users', Object.values(typingUsers).filter(Boolean));
    }
  });

  socket.on('private_message', ({ to, message }) => {
    const user = users[socket.id];
    const messageData = {
      id: Date.now(),
      sender: user?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit('user_left', { username: user.username, id: socket.id });
      delete users[socket.id];
      delete typingUsers[socket.id];
      io.to(user.room).emit('user_list', getUsersInRoom(user.room));
    }
  });
});

// Health check route
app.get('/', (req, res) => res.send('Socket.io Chat Server is running'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});