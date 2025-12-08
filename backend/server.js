// backend/server.js
const express = require('express');  
const cors = require('cors');
require('dotenv').config();

const documentsRouter = require('./routes/documents');

const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      "https://file-upload-brown.vercel.app/",   
      "http://localhost:5173",                       
    ],
    methods: "GET,POST,PUT,PATCH,DELETE",
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Document backend is running ✅' });
});

// Documents routes
app.use('/documents', documentsRouter);

// Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
