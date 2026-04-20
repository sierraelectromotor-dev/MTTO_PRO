const { Router } = require('express');
const { getTenantUsers, createUser } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

// Only ADMIN_EMPRESA and TECNICO can list users (Technicians need it for reassignment)
router.get('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA', 'TECNICO'), getTenantUsers);
router.post('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), createUser);

module.exports = router;
