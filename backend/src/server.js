require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const authenticateToken = require('./middleware/authMiddleware'); // Assuming it's here
const errorHandler = require('./middleware/errorMiddleware'); // Import error handler

// Import Routers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');

const app = express();
const PORT = process.env.PORT || 3001; // Use port from env or default

// --- Core Middleware ---
// Enable CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Allow frontend origin
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Needs auth middleware applied within its routes where needed
app.use('/api/groups', groupRoutes); // Needs auth middleware applied within its routes where needed
app.use('/api/events', eventRoutes); // Needs auth middleware applied within its routes where needed
app.use('/api/registrations', registrationRoutes); // Needs auth middleware applied within its routes where needed

// --- Simple Health Check Route ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- Catch-all for 404 Not Found (requests that didn't match any route) ---
app.use((req, res, next) => {
    res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});

// --- Centralized Error Handling Middleware (Must be LAST app.use()) ---
app.use(errorHandler);

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});