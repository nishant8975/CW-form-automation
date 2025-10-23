// src/controllers/authController.ts
import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabaseClient'; // Use the admin client
import jwt from 'jsonwebtoken';

// === REGISTER A NEW USER ===
export const register = async (req: Request, res: Response) => {
    const { college_id, full_name, role, branch, class_name, password } = req.body;

    if (!college_id || !full_name || !password || !role) {
        return res.status(400).json({ message: "Please provide all required fields." });
    }

    // Create the email address from the college ID
    const email = `${college_id}@kkwagh.edu.in`;

    try {
        // Use Supabase Auth to create the user. This is secure and handles everything.
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm user for simplicity
            user_metadata: {
                // This data will be used by our database trigger
                full_name: full_name,
                college_id: college_id,
                role: role,
                branch: branch,
                class_name: class_name
            }
        });

        if (authError) {
            // Handle specific errors, like user already exists
            if (authError.message.includes('unique constraint')) {
                return res.status(409).json({ message: 'User with this email or college ID already exists.' });
            }
            throw authError;
        }

        res.status(201).json({
            message: "User registered successfully!",
            user: authData.user
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: error.message || "Server error during registration." });
    }
};

// === LOG IN A USER ===
export const login = async (req: Request, res: Response) => {
    const { college_id, password } = req.body;

    if (!college_id || !password) {
        return res.status(400).json({ message: "Please provide college ID and password." });
    }

    const email = `${college_id}@kkwagh.edu.in`;

    try {
        // 1. Use Supabase to verify the password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (authError) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // 2. Fetch the user's profile from our public `profiles` table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ message: "User profile not found." });
        }

        // 3. Send back the Supabase token and the user profile
        res.status(200).json({
            message: "Login successful!",
            accessToken: authData.session.access_token,
            user: profile,
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message || "Server error during login." });
    }
};