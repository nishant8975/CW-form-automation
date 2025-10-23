import { Router } from 'express';
import { getAuthorities } from '../controllers/profileController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// @route   GET /api/profiles/authorities
// @desc    Get a list of all faculty members
// @access  Private (only logged-in users can see this)
router.get('/authorities', protect, getAuthorities);

export default router;
