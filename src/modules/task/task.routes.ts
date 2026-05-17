import { Router } from 'express';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getDashboardStats,
} from './task.controller';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard/stats', getDashboardStats);
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
