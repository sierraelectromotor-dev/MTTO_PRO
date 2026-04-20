const prisma = require('../config/database');
const bcrypt = require('bcrypt');

const getTenantUsers = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const users = await prisma.user.findMany({
      where: { tenant_id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        specialty: true
      }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener los usuarios', details: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { email, password, role, name, specialty } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        tenant_id,
        name: name || null,
        specialty: specialty || null
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        specialty: true
      }
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', data: newUser });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }
    res.status(500).json({ error: 'Fallo al crear el usuario', details: error.message });
  }
};

module.exports = { getTenantUsers, createUser };
