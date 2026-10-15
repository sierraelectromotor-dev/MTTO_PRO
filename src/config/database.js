const { PrismaClient } = require('@prisma/client');

// Use global singleton to prevent exhausting database connections in Serverless environments (like Vercel)
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
