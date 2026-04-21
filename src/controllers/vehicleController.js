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

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const hasReports = await prisma.faultReport.findFirst({ where: { vehicle_id: id }});
    if (hasReports) {
      return res.status(400).json({ error: 'No se puede eliminar un vehículo que ya posee historial de reportes.' });
    }

    await prisma.vehicle.delete({ where: { id, tenant_id } });
    res.json({ message: 'Vehículo eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Fallo al eliminar vehículo', details: err.message });
  }
};

module.exports = { getVehicles, createVehicle, deleteVehicle };
