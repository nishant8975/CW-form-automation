import { Request, Response, NextFunction } from 'express';
// Use the ADMIN client here just to verify the token initially
import { supabaseAdmin } from '../config/supabaseClient'; 

// Extend the Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: any; // Supabase user object
            token?: string; // Raw JWT token
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token using the admin client
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

            if (error || !user) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }

            // Attach user object AND the raw token to the request
            req.user = user;
            req.token = token; 

            next();

        } catch (error) {
            console.error("Auth Middleware Error:", error);
            return res.status(401).json({ message: 'Not authorized, token processing failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};
