// src/routes/authRoutes.ts

import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', login);

export default router;