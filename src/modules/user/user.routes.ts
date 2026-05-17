import { Router } from 'express';
import { getMe, updateProfile, changePassword } from './user.controller';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.get('/me', getMe);
router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);

export default router;
