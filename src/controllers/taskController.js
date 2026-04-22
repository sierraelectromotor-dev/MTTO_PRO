const prisma = require('../config/database');
const { sendPushNotification } = require('../config/firebase');

const getTasks = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    // We will fetch both Fault Reports and Work Orders
    const faultReports = await prisma.faultReport.findMany({
      where: { tenant_id },
      include: {
        vehicle: true,
        driver: { select: { email: true, name: true } }
      }
    });

    const workOrders = await prisma.workOrder.findMany({
      where: { tenant_id },
      include: {
        report: { include: { vehicle: true } },
        technician: { select: { email: true, name: true, specialty: true } },
        requestedParts: { orderBy: { createdAt: 'desc' } },
        logs: {
          include: { user: { select: { email: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ faultReports, workOrders });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener tareas', details: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    
    const [totalVehicles, reportedCount, inServiceCount] = await Promise.all([
      prisma.vehicle.count({ where: { tenant_id } }),
      prisma.faultReport.count({ where: { tenant_id, status: 'PENDIENTE' } }),
      prisma.workOrder.count({ where: { tenant_id, NOT: { status: { contains: 'TERMINADA' } } } })
    ]);

    res.json({
      totalVehicles,
      reportedCount,
      inServiceCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener estadísticas', details: error.message });
  }
};

const createWorkOrder = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id;
    const { report_id, technician_id, observations } = req.body;

    if (!report_id || !technician_id) {
      return res.status(400).json({ error: 'report_id y technician_id son obligatorios' });
    }

    const newOrder = await prisma.workOrder.create({
      data: {
        report_id,
        technician_id,
        observations,
        tenant_id
      }
    });

    // Update report status to EN_REPARACION instead of CONVERTIDO
    await prisma.faultReport.update({
      where: { id: report_id },
      data: { status: 'EN_REPARACION' }
    });

    const tech = await prisma.user.findUnique({ where: { id: technician_id }, select: { fcmToken: true } });
    if (tech && tech.fcmToken) {
      await sendPushNotification(tech.fcmToken, 'Nueva Orden de Trabajo', 'Se te ha asignado un nuevo vehículo para revisión.');
    }

    res.status(201).json({ message: 'Orden creada exitosamente', data: newOrder });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al crear orden de trabajo', details: error.message });
  }
};

// ----------------- DRIVER FUNCTIONS -----------------
const getDriverReports = async (req, res) => {
  try {
    const { id, tenant_id } = req.user;
    const reports = await prisma.faultReport.findMany({
      where: { driver_id: id, tenant_id },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener reportes', details: error.message });
  }
};

const createFaultReport = async (req, res) => {
  try {
    const { id, tenant_id } = req.user;
    const { vehicle_id, description, system_affected } = req.body;

    if (!vehicle_id || !description) return res.status(400).json({ error: 'Falta vehicle_id o description' });

    const newReport = await prisma.faultReport.create({
      data: {
        description,
        vehicle_id,
        driver_id: id,
        tenant_id,
        status: 'PENDIENTE',
        system_affected
      },
      include: { vehicle: true }
    });

    const admins = await prisma.user.findMany({ where: { tenant_id, role: 'ADMIN_EMPRESA' }, select: { email: true, fcmToken: true } });
    console.log(`Found ${admins.length} admins to notify. Tokens:`, admins.map(a => a.fcmToken ? 'YES' : 'NO'));
    for (const admin of admins) {
      if (admin.fcmToken) {
        console.log(`Sending New Report push to ${admin.email}...`);
        await sendPushNotification(admin.fcmToken, 'Nuevo Reporte de Falla', `Vehículo ${newReport.vehicle.plate}: ${description}`);
      }
    }

    res.status(201).json({ message: 'Reporte creado', data: newReport });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al reportar', details: error.message });
  }
};

// ----------------- TECHNICIAN FUNCTIONS -----------------
const getTechnicianOrders = async (req, res) => {
  try {
    const { id, tenant_id } = req.user;
    const orders = await prisma.workOrder.findMany({
      where: { technician_id: id, tenant_id },
      include: {
        report: { include: { vehicle: true } },
        logs: { include: { user: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener tareas', details: error.message });
  }
};

const updateWorkOrder = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { id: current_user_id, tenant_id, role } = req.user;
    const { status, concepts, conclusion, technician_id, log_notes } = req.body;

    const order = await prisma.workOrder.findFirst({
      where: { id: order_id, tenant_id }
    });

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    
    if (role === 'TECNICO' && order.technician_id !== current_user_id) {
       return res.status(403).json({ error: 'Operación denegada' });
    }

    const updated = await prisma.workOrder.update({
      where: { id: order_id },
      data: { 
        ...(status && { status }),
        ...(concepts !== undefined && { concepts }),
        ...(conclusion !== undefined && { conclusion }),
        ...(technician_id && { technician_id })
      }
    });

    // Enrich logs with details
    let finalNotes = log_notes || '';
    if (concepts) finalNotes += ` \n[Hallazgos]: ${concepts}`;
    if (conclusion) finalNotes += ` \n[Conclusión]: ${conclusion}`;
    if (technician_id) finalNotes += ` \nReasignado a técnico ID: ${technician_id}`;

    // If order is finished, calculate duration and mark report as CONVERTIDO
    if (status && (status === 'TERMINADA' || status === 'TERMINADA_CON_NOVEDAD')) {
      const start = new Date(order.createdAt);
      const end = new Date();
      const diffMs = end - start;
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      finalNotes += ` \n\n⏱️ RESUMEN DE TIEMPO: ${hours}h ${minutes}m desde la asignación.`;

      await prisma.faultReport.update({
        where: { id: order.report_id },
        data: { status: 'CONVERTIDO' }
      });

      const reportData = await prisma.faultReport.findUnique({ where: { id: order.report_id }, include: { vehicle: true }});
      const admin = await prisma.user.findFirst({ where: { tenant_id, role: 'ADMIN_EMPRESA' }, select: { fcmToken: true } });
      if (admin && admin.fcmToken && reportData) {
        await sendPushNotification(admin.fcmToken, 'Reparación Terminada', `El técnico ha terminado el mantenimiento del vehículo ${reportData.vehicle.plate}.`);
      }
    }

    await prisma.workOrderLog.create({
      data: {
        old_status: order.status,
        new_status: status || order.status,
        notes: finalNotes.trim() || 'Actualización de orden.',
        work_order_id: order.id,
        user_id: current_user_id
      }
    });

    res.json({ message: 'Orden actualizada', data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al actualizar', details: error.message });
  }
};

// ----------------- WAREHOUSE & PARTS FUNCTIONS -----------------
const requestParts = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { parts } = req.body; // Array of { name, quantity }

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'La lista de repuestos no puede estar vacía' });
    }

    const order = await prisma.workOrder.findFirst({ where: { id: order_id, tenant_id } });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    // Validate we are EN_PROCESO
    if (order.status !== 'EN_PROCESO' && order.status !== 'REPUESTOS_RECIBIDOS') {
      return res.status(400).json({ error: 'Estado inválido para pedir repuestos' });
    }

    // Insert requested parts
    const createdParts = await Promise.all(parts.map(p => 
      prisma.requestedPart.create({
        data: {
          name: p.name,
          quantity: parseInt(p.quantity, 10) || 1,
          work_order_id: order.id,
          tenant_id
        }
      })
    ));

    // Update order status to ESPERANDO_REPUESTOS
    await prisma.workOrder.update({
      where: { id: order.id },
      data: { status: 'ESPERANDO_REPUESTOS' }
    });

    // Format parts list for log
    const partsDetail = parts.map(p => `${p.quantity}x ${p.name}`).join(', ');

    // Log the request with detail
    await prisma.workOrderLog.create({
      data: {
        old_status: order.status,
        new_status: 'ESPERANDO_REPUESTOS',
        notes: `Técnico solicitó repuestos: ${partsDetail}`,
        work_order_id: order.id,
        user_id
      }
    });

    const orderData = await prisma.workOrder.findUnique({ where: { id: order_id }, include: { report: { include: { vehicle: true } } } });
    const admins = await prisma.user.findMany({ where: { tenant_id, role: 'ADMIN_EMPRESA' }, select: { email: true, fcmToken: true } });
    console.log(`Found ${admins.length} admins for parts approval notification.`);
    for (const admin of admins) {
      if (admin.fcmToken) {
        console.log(`Sending Parts Approval push to ${admin.email}...`);
        await sendPushNotification(admin.fcmToken, 'Aprobación de Repuestos', `Mecánico solicita repuestos para el vehículo ${orderData.report.vehicle.plate}.`);
      }
    }

    res.json({ message: 'Repuestos solicitados', data: createdParts });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al solicitar repuestos', details: error.message });
  }
};

const deleteRequestedPart = async (req, res) => {
  try {
    const { part_id } = req.params;
    const { tenant_id } = req.user;

    const part = await prisma.requestedPart.findFirst({ where: { id: part_id, tenant_id } });
    if (!part) return res.status(404).json({ error: 'Item no encontrado' });

    await prisma.requestedPart.delete({ where: { id: part_id } });
    res.json({ message: 'Item eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al eliminar repuesto', details: error.message });
  }
};

const approvePartsForOrder = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { tenant_id, id: admin_id } = req.user;

    // Approves all pending parts for this order
    await prisma.requestedPart.updateMany({
      where: { work_order_id: order_id, tenant_id, status: 'PENDIENTE_APROBACION' },
      data: { status: 'APROBADO', approver_id: admin_id }
    });

    await prisma.workOrderLog.create({
      data: {
        old_status: 'ESPERANDO_REPUESTOS',
        new_status: 'ESPERANDO_REPUESTOS',
        notes: `El Administrador aprobó la lista de repuestos. Pasada a Bodega.`,
        work_order_id: order_id,
        user_id: admin_id
      }
    });

    const almacenes = await prisma.user.findMany({ where: { tenant_id, role: 'ALMACENISTA' }, select: { fcmToken: true } });
    for (const alm of almacenes) {
      if (alm.fcmToken) await sendPushNotification(alm.fcmToken, 'Repuestos Aprobados', 'Hay una nueva lista de repuestos esperando empacado y despacho.');
    }

    res.json({ message: 'Lista enviada a almacén' });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al aprobar', details: error.message });
  }
};

// Almacenista functions
const getWarehouseRequests = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    // Get orders that have APPROVED parts or parts currently in warehouse logic
    const orders = await prisma.workOrder.findMany({
      where: { 
        tenant_id, 
        requestedParts: { some: { status: { in: ['APROBADO', 'DISPONIBLE', 'NO_DISPONIBLE'] } } }
      },
      include: {
        report: { include: { vehicle: true } },
        technician: { select: { name: true, specialty: true } },
        requestedParts: {
          where: { status: { in: ['APROBADO', 'DISPONIBLE', 'NO_DISPONIBLE'] } },
          include: { approver: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener pedidos', details: error.message });
  }
};

const updatePartStatus = async (req, res) => {
  try {
    const { part_id } = req.params;
    const { status } = req.body; // DISPONIBLE or NO_DISPONIBLE
    const { tenant_id } = req.user;

    await prisma.requestedPart.updateMany({
      where: { id: part_id, tenant_id },
      data: { status }
    });
    res.json({ message: 'Item actualizado', status });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al actualizar', details: error.message });
  }
};

const dispatchParts = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    // Log that parts are ready for pickup
    await prisma.workOrderLog.create({
      data: {
        old_status: 'ESPERANDO_REPUESTOS',
        new_status: 'ESPERANDO_REPUESTOS',
        notes: `ALMACÉN: Repuestos listos para recolección. Por favor acercarse a ventanilla.`,
        work_order_id: order_id,
        user_id
      }
    });

    const orderData = await prisma.workOrder.findUnique({ where: { id: order_id }, select: { technician: { select: { fcmToken: true } } }});
    if (orderData && orderData.technician && orderData.technician.fcmToken) {
      await sendPushNotification(orderData.technician.fcmToken, 'Repuestos en Ventanilla', 'Almacén tiene listos los repuestos empacados de tu orden.');
    }

    res.json({ message: 'Técnico notificado' });
  } catch (error) {
    res.status(500).json({error: 'Fallo al notificar', details: error.message});
  }
};

const deliverParts = async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { tenant_id, id: user_id } = req.user;

    // Set all DISPONIBLE items to ENTREGADO
    await prisma.requestedPart.updateMany({
      where: { work_order_id: order_id, tenant_id, status: 'DISPONIBLE' },
      data: { status: 'ENTREGADO' }
    });

    await prisma.workOrderLog.create({
      data: {
        old_status: 'ESPERANDO_REPUESTOS',
        new_status: 'REPUESTOS_RECIBIDOS',
        notes: `ALMACÉN: Repuestos entregados formalmente al técnico.`,
        work_order_id: order_id,
        user_id
      }
    });

    // Also update order status to REPUESTOS_RECIBIDOS automatically
    await prisma.workOrder.update({
      where: { id: order_id },
      data: { status: 'REPUESTOS_RECIBIDOS' }
    });

    res.json({ message: 'Entrega registrada correctamente' });
  } catch (error) {
    res.status(500).json({error: 'Fallo al entregar', details: error.message});
  }
};

module.exports = { 
  getTasks, createWorkOrder, getDriverReports, createFaultReport, 
  getTechnicianOrders, updateWorkOrder,
  requestParts, deleteRequestedPart, approvePartsForOrder,
  getWarehouseRequests, updatePartStatus, dispatchParts, deliverParts,
  getStats
};
