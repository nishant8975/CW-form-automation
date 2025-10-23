import { Router } from 'express';
import { 
    createRequest, 
    getMyRequests, 
    getPendingRequests,
    processDecision,
    getRequestById
} from '../controllers/requestController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
console.log('--- Request Router Initialized ---'); // Add this line

// --- STUDENT ROUTES ---
router.get('/my-requests', protect, (req, res, next) => { console.log('Hit GET /my-requests'); next(); }, getMyRequests);
router.post('/', protect, (req, res, next) => { console.log('Hit POST /'); next(); }, createRequest);

// --- FACULTY ROUTES ---
router.get('/pending', protect, (req, res, next) => { console.log('Hit GET /pending'); next(); }, getPendingRequests);

// --- SHARED & ACTION ROUTES ---
// GET /api/requests/:id
router.get('/:id', protect, (req, res, next) => { console.log(`Hit GET /${req.params.id}`); next(); }, getRequestById);

// POST /api/requests/:id/decision
router.post('/:id/decision', protect, (req, res, next) => { console.log(`Hit POST /${req.params.id}/decision`); next(); }, processDecision);


export default router;

