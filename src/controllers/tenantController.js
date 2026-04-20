const prisma = require('../config/database');
const bcrypt = require('bcrypt');

const createTenant = async (req, res) => {
  try {
    const { name, nit, plan_type, adminEmail, adminPassword } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (name, adminEmail, adminPassword)' });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Using transaction to create both tenant and the admin user atomically
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          nit: nit || 'S/N',
          plan_type: plan_type || 'BASIC',
        }
      });

      const newAdmin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN_EMPRESA',
          tenant_id: newTenant.id
        }
      });

      return { tenant: newTenant, admin: newAdmin };
    });

    res.status(201).json({ 
      message: 'Empresa y administrador creados exitosamente',
      data: {
        tenant: result.tenant,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          role: result.admin.role
        }
      }
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El email del administrador ya está en uso' });
    }
    res.status(500).json({ error: 'Fallo al crear la empresa', details: error.message });
  }
};

const getTenants = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          where: { role: 'ADMIN_EMPRESA' },
          select: { id: true, email: true, role: true }
        }
      }
    });
    res.status(200).json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener las empresas', details: error.message });
  }
};

module.exports = { createTenant, getTenants };
