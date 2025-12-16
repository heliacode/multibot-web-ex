import express from 'express';
import * as bitTriggerController from '../controllers/bitTriggerController.js';

const router = express.Router();

router.post('/', bitTriggerController.createTrigger);
router.get('/', bitTriggerController.getTriggers);
router.get('/:id', bitTriggerController.getTrigger);
router.put('/:id', bitTriggerController.updateTrigger);
router.delete('/:id', bitTriggerController.deleteTrigger);

export default router;

