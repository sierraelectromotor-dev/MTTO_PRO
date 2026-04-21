const { Router } = require('express');
const { getTenantUsers, createUser, updateFCMToken, deleteUser } = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

// Only ADMIN_EMPRESA and TECNICO can list users (Technicians need it for reassignment)
router.get('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA', 'TECNICO'), getTenantUsers);
router.post('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), createUser);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), deleteUser);

// Push Notifications (cualquier usuario logueado puede guardar su propio token)
router.post('/fcm-token', authMiddleware, updateFCMToken);

module.exports = router;
