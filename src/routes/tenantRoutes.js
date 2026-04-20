const { Router } = require('express');
const { createTenant, getTenants } = require('../controllers/tenantController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

// Endpoint restringido solo para SUPERADMIN
router.post('/', authMiddleware, roleMiddleware('SUPERADMIN'), createTenant);
router.get('/', authMiddleware, roleMiddleware('SUPERADMIN'), getTenants);

module.exports = router;
