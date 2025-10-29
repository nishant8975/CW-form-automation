import { Router } from 'express';
import multer from 'multer'; // 1. Import multer
import {
    createRequest,
    getMyRequests,
    getPendingRequests,
    processDecision,
    getRequestById,
    getTimetable // Assuming you added this
    // generateSanctionFormPdf // If you added this
} from '../controllers/requestController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// 2. Configure Multer (as before)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size (e.g., 5MB)
    fileFilter: (req, file, cb) => { // Optional: Filter for image types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            // Use specific error message
            cb(new Error('Only image files are allowed!'));
        }
    }
});

console.log('--- Request Router Initialized ---');

// --- STUDENT ROUTES ---
router.get('/my-requests', protect, getMyRequests);

// ✨ 3. Apply multer middleware WITH specific error handling wrapper ✨
router.post('/', protect, (req, res, next) => {
    // Run the multer middleware function
    upload.single('attendanceScreenshot')(req, res, (err: any) => { // Use 'any' for broader error catching initially
        // Check specifically for Multer errors (e.g., file size limit)
        if (err instanceof multer.MulterError) {
            console.error("[Multer Error]:", err);
            return res.status(400).json({ message: `File upload error: ${err.message}. Please check file size or type.` });
        }
        // Check for other errors (e.g., file filter error)
        else if (err) {
            console.error("[Unknown Upload Error or FileFilter Error]:", err);
             // Check if it's the fileFilter error message we defined
             if (err.message === 'Only image files are allowed!') {
                 return res.status(400).json({ message: err.message });
             }
            // Otherwise, it's an unexpected error
            return res.status(500).json({ message: "An unexpected error occurred during file upload." });
        }

        // If upload.single() completed without errors, req.file and req.body should be populated.
        console.log("Multer finished processing. req.body keys:", req.body ? Object.keys(req.body) : 'undefined'); // Log body keys AFTER multer
        console.log("Multer finished processing. req.file:", req.file ? req.file.originalname : 'undefined'); // Log file info AFTER multer

        // Proceed to the next middleware/controller ONLY if there were no errors
        next();
    });
}, createRequest); // Your createRequest controller runs AFTER the wrapper calls next()


// --- FACULTY ROUTES ---
router.get('/pending', protect, getPendingRequests);

// --- SHARED & ACTION ROUTES ---
router.get('/timetable', protect, getTimetable);
router.get('/:id', protect, getRequestById);
router.post('/:id/decision', protect, processDecision);
// router.get('/generate-pdf/:id', protect, generateSanctionFormPdf);


export default router;

