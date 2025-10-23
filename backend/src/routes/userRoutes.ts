// src/routes/userRoutes.ts
import { Router } from 'express';
import { getMe } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware'; // Import our middleware

const router = Router();

// @route   GET /api/users/me
// @desc    Get the profile of the logged-in user
// @access  Private
router.get('/me', protect, getMe); // <-- We apply the middleware here

export default router;