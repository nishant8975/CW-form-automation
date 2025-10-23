import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import all route files
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import requestRoutes from './routes/requestRoutes'; // Make sure filename matches
import profileRoutes from './routes/profileRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// === Use API Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes); // Make sure variable matches import
app.use('/api/profiles', profileRoutes);

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Classwork Automation API!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

