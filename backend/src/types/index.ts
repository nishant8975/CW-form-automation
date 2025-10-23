// Interface for user profile data stored in the public 'profiles' table
export interface Profile {
    id: string; // UUID from auth.users
    full_name: string;
    college_id: string;
    role: string; // e.g., 'STUDENT', 'FACULTY', 'HOD', etc.
    branch?: string | null;
    class_name?: string | null;
    email?: string; // Optional: May not be in profiles table
    // Add other profile fields if needed
}

// Interface for the main classwork request data
export interface ClassworkRequest {
    id: number;
    student_id: string;
    activity_name: string;
    status: string; // 'PENDING', 'APPROVED', etc.
    duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
    start_date: string; // Consider using Date type if preferred
    end_date?: string | null;
    justification_text?: string | null;
    current_approver_id?: string | null;
    created_at: string;
    // Include the nested student profile if fetched
    student?: Profile | null;
}

// ✨ NEW: Interface for approval history steps ✨
export interface ApprovalStep {
    id: number;
    request_id: number;
    approver_id: string;
    status: string; // 'APPROVED' or 'REJECTED'
    remarks?: string | null;
    created_at: string;
    // Include nested approver profile if fetched
    approver?: Partial<Profile> | null;
}

// ✨ NEW: Interface for lecture details ✨
export interface Lecture {
    id: number;
    request_id: number;
    subject_name: string;
    lecture_time: string;
}

// Interface for mock attendance data (can be refined)
export interface MockAttendance {
     overallAverage: number;
     subject_breakdown: { subjectName: string; attendance: number }[];
}

