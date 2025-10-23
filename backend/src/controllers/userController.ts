// src/controllers/userController.ts
import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabaseClient';

export const getMe = async (req: Request, res: Response) => {
    // Thanks to our middleware, req.user is available here
    const userId = req.user.id;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        res.status(200).json(profile);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
