import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabaseClient';

// === GET ALL FACULTY PROFILES FOR DROPDOWNS ===
export const getAuthorities = async (req: Request, res: Response) => {
    try {
        // Fetch all users that are not 'STUDENT'
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .not('role', 'eq', 'STUDENT') // Exclude students from the list
            .order('full_name', { ascending: true });

        if (error) throw error;

        res.status(200).json(data);

    } catch (error: any) {
        console.error('Get Authorities Error:', error);
        res.status(500).json({ message: error.message || "Server error while fetching authorities." });
    }
};

/**
 * @desc    Get all faculty profiles for dropdowns
 * @route   GET /api/profiles/authorities
 * @access  Private
 */
export const getFacultyProfiles = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            // Exclude students from the list of potential approvers
            .neq('role', 'STUDENT');

        if (error) throw error;
        
        res.status(200).json(data);
    } catch (error: any) {
        console.error('Get Faculty Profiles Error:', error);
        res.status(500).json({ message: error.message || "Server error while fetching faculty profiles." });
    }
};
