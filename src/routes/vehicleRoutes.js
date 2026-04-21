const { Router } = require('express');
const { getVehicles, createVehicle, deleteVehicle } = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

router.get('/', authMiddleware, getVehicles);
router.post('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), createVehicle);
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), deleteVehicle);

module.exports = router;
