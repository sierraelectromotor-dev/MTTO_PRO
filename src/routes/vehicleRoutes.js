const { Router } = require('express');
const { getVehicles, createVehicle } = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = Router();

router.get('/', authMiddleware, getVehicles);
router.post('/', authMiddleware, roleMiddleware('ADMIN_EMPRESA'), createVehicle);

module.exports = router;
