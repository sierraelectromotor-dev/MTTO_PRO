const { Router } = require('express');
const { 
  getTasks, createWorkOrder, getDriverReports, createFaultReport, 
  getTechnicianOrders, updateWorkOrder,
  requestParts, deleteRequestedPart, approvePartsForOrder,
  getWarehouseRequests, updatePartStatus, dispatchParts, deliverParts,
  getStats
} = require('../controllers/taskController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

// Empresa
router.get('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), getTasks);
router.get('/stats', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), getStats);
router.post('/work-orders', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), createWorkOrder);
router.patch('/work-orders/:id/parts-review', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), approvePartsForOrder);
router.delete('/parts/:part_id', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), deleteRequestedPart);

// Conductor
router.get('/my-reports', authMiddleware, roleMiddleware('CONDUCTOR'), getDriverReports);
router.post('/fault-reports', authMiddleware, roleMiddleware('CONDUCTOR'), createFaultReport);

// Técnico
router.get('/my-orders', authMiddleware, roleMiddleware('TECNICO'), getTechnicianOrders);
router.patch('/work-orders/:id', authMiddleware, roleMiddleware('TECNICO'), updateWorkOrder);
router.post('/work-orders/:id/parts', authMiddleware, roleMiddleware('TECNICO'), requestParts);

// Almacenista
router.get('/warehouse', authMiddleware, roleMiddleware('ALMACENISTA'), getWarehouseRequests);
router.patch('/warehouse/parts/:part_id', authMiddleware, roleMiddleware('ALMACENISTA'), updatePartStatus);
router.patch('/warehouse/orders/:id/dispatch', authMiddleware, roleMiddleware('ALMACENISTA'), dispatchParts);
router.patch('/warehouse/orders/:id/deliver', authMiddleware, roleMiddleware('ALMACENISTA'), deliverParts);

module.exports = router;
