// Define and export the request_status type based on your SQL ENUM
export type request_status =
    | 'PENDING'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'PENDING_HOD_EXCEPTION';

// Interface for user profile data stored in the public 'profiles' table
export interface Profile {
    id: string; // UUID from auth.users
    full_name: string;
    college_id: string;
    role: string; // e.g., 'STUDENT', 'FACULTY', 'HOD', etc.
    branch?: string | null;
    class_name?: string | null;
    email?: string; // Optional: May not be in profiles table

    // Coordinator links
    class_coordinator_id?: string | null;
    academic_coordinator_id?: string | null;
    hod_id?: string | null;
    // signature_image_url?: string | null; // For future signature feature
}

// Interface for the main classwork request data, ensuring all fields are included
export interface ClassworkRequest {
    id: number; // From SQL Schema
    student_id: string;
    activity_name: string;
    status: request_status; // Use the defined type
    duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
    start_date: string;
    end_date?: string | null;
    justification_text?: string | null;       // For HOD Exception
    current_approver_id?: string | null;    // Who currently has it
    created_at: string;
    attendance_snapshot?: {                 // Added
        overallAverage: number;
        // subject_breakdown?: any[];       // Optional breakdown
    } | null;
    attendance_screenshot_url?: string | null; // Added

    // Include nested data if fetched by API (e.g., getRequestById)
    student?: Profile | null;               // Nested student profile
    current_approver?: Partial<Profile> | null; // Nested current approver (e.g., from getMyRequests)
    lectures?: Lecture[];                   // Nested lectures for single day
    approvalHistory?: ApprovalStepApi[];    // Nested approval history (using API type)
}

// Interface for approval history steps (as returned directly by API with nested data)
// Renamed to avoid conflict with ApprovalStep component type if needed
export interface ApprovalStepApi {
    id: number;
    request_id: number;
    approver_id: string;
    status: 'APPROVED' | 'REJECTED'; // Specific decision status
    remarks?: string | null;
    created_at: string;
    // Include nested approver profile if fetched
    approver?: Partial<Profile> | null;
}


// Interface for lecture details
export interface Lecture {
    id?: number; // Optional ID from DB if fetched directly
    request_id?: number; // Optional request ID if fetched directly
    subject_name: string;
    lecture_time: string;
}

// Interface for mock attendance data (can be refined)
// Merged from previous versions
export interface MockAttendance {
      overallAverage: number;
      subject_breakdown?: { subjectName: string; attendance: number }[];
}

