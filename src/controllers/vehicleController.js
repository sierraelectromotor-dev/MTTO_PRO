const prisma = require('../config/database');

const getVehicles = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;

    // The core of the multi-tenant design:
    // ALWAYS force the tenant_id from the token into all queries
    const vehicles = await prisma.vehicle.findMany({
      where: {
        tenant_id,
      },
      include: {
        faultReports: true
      }
    });

    res.json({ data: vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
  }
};

const createVehicle = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { plate, brand, model, status } = req.body;

    if (!plate || !brand || !model) {
      return res.status(400).json({ error: 'Faltan datos (plate, brand, model)' });
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        plate,
        brand,
        model,
        status: status || 'OPERATIVO',
        tenant_id
      }
    });

    res.status(201).json({ message: 'Vehículo creado', data: newVehicle });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'La placa ya está registrada' });
    res.status(500).json({ error: 'Fallo al crear vehículo', details: error.message });
  }
};

module.exports = { getVehicles, createVehicle };
