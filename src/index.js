const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/vehicles', vehicleRoutes);
app.use('/vehicles', vehicleRoutes);

app.use('/api/tenants', tenantRoutes);
app.use('/tenants', tenantRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/tasks', taskRoutes);
app.use('/tasks', taskRoutes);

// Diagnostic & Health Routes
app.get('/api/debug/firebase', (req, res) => {
  const { initialized } = require('./config/firebase');
  res.json({ firebase_online: initialized });
});

app.get(['/api', '/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'mtto-api', timestamp: new Date() });
});

const PORT = process.env.PORT || 3005;

// Only listen on port if executed directly (e.g. node src/index.js or nodemon)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
