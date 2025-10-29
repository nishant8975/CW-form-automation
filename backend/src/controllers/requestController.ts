// ✨ FIX: Ensure all types, including ClassworkRequest, are correctly imported
import { supabaseAdmin as supabase, supabaseUrl, supabaseServiceKey } from '../config/supabaseClient';
import { Request, Response } from 'express';
import { Profile, Lecture, request_status, ApprovalStepApi, ClassworkRequest } from '../types';
import { sendEmail } from "../utils/mailer";
import { createClient } from '@supabase/supabase-js';

// ✨ Define TimetableLecture interface at the top level
interface TimetableLecture {
    lecture_time: string;
    subject_name: string;
}

// ✨ ADD THE MISSING MOCK ATTENDANCE FUNCTION DEFINITION HERE
// --- Mock ERP Function: Simulates fetching a student's attendance. ---
const getMockAttendance = (studentId: string): { overallAverage: number } => {
    // Log that we are using the simple mock
    console.log(`[getMockAttendance] Using SIMPLE RANDOM mock for student ID: ${studentId}`);

    // 80% chance of being eligible
    const isEligible = Math.random() > 0.2;
    const overallAverage = isEligible ? Math.floor(Math.random() * 25) + 75 : Math.floor(Math.random() * 20) + 55;

    // Return the basic structure needed
    return { overallAverage };
};

// ✨ Placeholder: Replace with your actual timetable logic
const mockTimetableBackend: TimetableLecture[] = [
    { lecture_time: "09:00 AM - 10:00 AM", subject_name: "Operating Systems" },
    { lecture_time: "10:00 AM - 11:00 AM", subject_name: "Data Structures" },
    { lecture_time: "11:00 AM - 12:00 PM", subject_name: "DSA Lab" },
    { lecture_time: "01:00 PM - 02:00 PM", subject_name: "Computer Networks" },
];


// === GET TIMETABLE FOR A SPECIFIC DATE ===
export const getTimetable = async (req: Request, res: Response) => {
    const date = req.query.date as string;
    const studentId = req.user.id; // Optional: May need student info for timetable
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [getTimetable] Fetching timetable for date: ${date}, Student: ${studentId}`);

    if (!date) {
        console.warn(`[${timestamp}] [getTimetable] FAILED - Date parameter is missing.`);
        return res.status(400).json({ message: "Date parameter is required." });
    }

    try {
        // --- TODO: Implement Real Timetable Fetching Logic ---
        // 1. Determine how to get the timetable:
        //    - Query a database table?
        //    - Call an external ERP API?
        //    - Calculate based on day of week / student's class/branch?
        // 2. Fetch the actual lectures for the given 'date' (and potentially 'studentId').
        // 3. Ensure the result is an array of objects: { lecture_time: string, subject_name: string }
        //
        // Example (Database Query - adjust table/column names):
        // const { data: studentProfile } = await supabase.from('profiles').select('class_name, branch').eq('id', studentId).single();
        // if (!studentProfile) throw new Error('Student profile not found');
        // const dayOfWeek = new Date(date).getDay(); // 0=Sun, 1=Mon, etc.
        // const { data: timetableData, error } = await supabase
        //    .from('timetables')
        //    .select('lecture_time, subject_name')
        //    .eq('class_name', studentProfile.class_name)
        //    .eq('day_of_week', dayOfWeek) // Assuming you store day of week
        //    .order('lecture_time');
        // if (error) throw error;
        // --------------------------------------------------------

        // Using mock data for now:
        const timetableData: TimetableLecture[] = mockTimetableBackend;
        console.log(`[${timestamp}] [getTimetable] Returning mock timetable data.`);

        res.status(200).json(timetableData);

    } catch (error: any) {
        console.error(`[${timestamp}] [getTimetable] FAILED - Error fetching timetable:`, error.message || error);
        res.status(500).json({ message: "Server error while fetching timetable.", error: error.message });
    }
};

// === CREATE NEW REQUEST (Handles Screenshot Upload) ===
export const createRequest = async (req: Request, res: Response) => {
    // ... (createRequest implementation as updated previously) ...
     const studentId = req.user.id;
    // ✨ 1. Destructure form fields from req.body (Multer puts text fields here)
    const {
        activity_name,
        duration_type, // 'SINGLE_DAY' or 'MULTI_DAY'
        start_date,
        end_date,
        lectures: lecturesJson, // Lectures might come as JSON string
        justification_text,
        concerned_authority_id
    } = req.body;

    // ✨ 2. Access the uploaded file via req.file (provided by Multer)
    const file = req.file;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [createRequest] START - User: ${studentId}, Activity: ${activity_name}`);

    // --- Basic Validation ---
    if (!activity_name || !duration_type || !concerned_authority_id || !start_date) {
        console.warn(`[${timestamp}] [createRequest] FAILED - Missing required fields.`);
        return res.status(400).json({ message: "Activity name, duration type, start date, and concerned authority are required." });
    }
    if (duration_type === 'MULTI_DAY' && !end_date) {
        console.warn(`[${timestamp}] [createRequest] FAILED - End date required for multi-day requests.`);
        return res.status(400).json({ message: "End date is required for multi-day requests." });
    }
    // ✨ Phase 1: Screenshot is now mandatory
    if (!file) {
         console.warn(`[${timestamp}] [createRequest] FAILED - Attendance screenshot file is missing.`);
         return res.status(400).json({ message: "Attendance screenshot is required." });
    }
    // --- End Validation ---

    // Parse lectures if provided (for single day)
    let lectures: Lecture[] = [];
    if (duration_type === 'SINGLE_DAY' && lecturesJson) {
        try {
            // Check if it's already an array (might happen depending on how FormData is sent/parsed)
            if (Array.isArray(lecturesJson)) {
                lectures = lecturesJson;
            } else if (typeof lecturesJson === 'string'){
                lectures = JSON.parse(lecturesJson);
            } else {
                 throw new Error('Lectures data type is unexpected.');
            }
            if (!Array.isArray(lectures)) throw new Error('Parsed lectures must be an array.');
            // Basic validation of lecture objects (optional but recommended)
            if (lectures.some(lec => typeof lec.subject_name !== 'string' || typeof lec.lecture_time !== 'string')) {
                 throw new Error('Each lecture must have subject_name and lecture_time as strings.');
            }
        } catch (parseError: any) {
             console.warn(`[${timestamp}] [createRequest] FAILED - Invalid lectures format:`, parseError?.message || parseError);
            return res.status(400).json({ message: "Invalid format for lectures data. Ensure it's a JSON array of objects with 'subject_name' and 'lecture_time'." });
        }
    }


    try {
        // --- Attendance Check (still using mock for now) ---
        const attendance = getMockAttendance(studentId);
        let status: request_status = 'PENDING';
        let current_approver_id: string | null = concerned_authority_id;

        if (attendance.overallAverage < 75) {
             console.log(`[${timestamp}] [createRequest] Attendance (${attendance.overallAverage}%) below threshold for student ${studentId}.`);
            if (!justification_text) {
                // If low attendance and NO justification provided yet, send 402
                 console.warn(`[${timestamp}] [createRequest] FAILED - Justification required due to low attendance.`);
                return res.status(402).json({
                    message: "Attendance is below 75%. Justification is required.",
                    attendance: attendance.overallAverage
                });
            }
            // If justification IS provided with the initial low-attendance submission
            console.log(`[${timestamp}] [createRequest] Low attendance, but justification provided. Routing to HOD.`);
            status = 'PENDING_HOD_EXCEPTION';
            // Find HOD's ID
            const { data: hod, error: hodError } = await supabase.from('profiles').select('id').eq('role', 'HOD').limit(1).single();
            if (hodError || !hod) {
                 console.error(`[${timestamp}] [createRequest] FAILED - Cannot find HOD profile:`, hodError);
                return res.status(500).json({ message: "System configuration error: HOD profile not found." });
            }
            current_approver_id = hod.id;
        } else {
             console.log(`[${timestamp}] [createRequest] Attendance (${attendance.overallAverage}%) meets requirement for student ${studentId}. Standard routing.`);
             current_approver_id = concerned_authority_id; // Start with concerned authority
        }
        // --- End Attendance Check ---


        // ✨ 3. Upload Screenshot to Supabase Storage ---
        let screenshotUrl: string | null = null;
        if (file) {
            // Construct a unique file path, e.g., studentId/timestamp_originalName.ext
            // Using timestamp ensures uniqueness even if student submits quickly
            const fileExt = file.originalname.split('.').pop();
            const uniqueFileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Sanitize filename
            const filePath = `${studentId}/${uniqueFileName}`;
            console.log(`[${timestamp}] [createRequest] Uploading screenshot to path: ${filePath}`);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('attendance-screenshots')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false // Don't overwrite existing files
                });

            if (uploadError) {
                console.error(`[${timestamp}] [createRequest] FAILED - Supabase storage upload error:`, uploadError);
                // Fail the request if upload fails
                return res.status(500).json({ message: "Failed to upload attendance screenshot.", error: uploadError.message });
            }

            // Get the public URL (ensure bucket allows public access OR use signed URLs later)
            // It's generally better to store the *path* (filePath) and generate URLs on demand.
            // Let's store the path for more flexibility.
            screenshotUrl = filePath; // Store the path
             console.log(`[${timestamp}] [createRequest] Screenshot uploaded successfully. Path stored: ${screenshotUrl}`);

        }
        // --- End Screenshot Upload ---

        // --- Insert Request into Database ---
        console.log(`[${timestamp}] [createRequest] Inserting request into database...`);
        const { data: newRequestData, error: requestError } = await supabase
            .from('requests')
            .insert({
                student_id: studentId,
                activity_name,
                duration_type,
                start_date,
                end_date: duration_type === 'MULTI_DAY' ? end_date : null,
                status,
                justification_text: justification_text || null,
                current_approver_id: current_approver_id,
                attendance_snapshot: attendance, // Save mock attendance data
                attendance_screenshot_url: screenshotUrl // ✨ 4. Save the path
            })
            .select('id') // Select only the ID initially
            .single();

        if (requestError) {
             console.error(`[${timestamp}] [createRequest] FAILED - Database insert error:`, requestError);
             // Attempt to delete the uploaded file if DB insert fails? (Optional cleanup)
             if (screenshotUrl) {
                  console.warn(`[${timestamp}] [createRequest] Attempting to clean up uploaded file: ${screenshotUrl}`);
                  await supabase.storage.from('attendance-screenshots').remove([screenshotUrl]);
             }
            throw requestError; // Let outer catch handle
        }
        const newRequestId = newRequestData?.id;
        if (!newRequestId) {
             console.error(`[${timestamp}] [createRequest] FAILED - Did not get ID back after insert.`);
            throw new Error("Failed to retrieve new request ID after insert.");
        }
        console.log(`[${timestamp}] [createRequest] Request created successfully with ID: ${newRequestId}`);
        // --- End Insert Request ---


        // --- Insert Lectures if Single Day ---
        if (duration_type === 'SINGLE_DAY' && lectures.length > 0) {
            console.log(`[${timestamp}] [createRequest] Inserting ${lectures.length} lectures for request ID: ${newRequestId}...`);
            const lectureData = lectures.map((lec: { subject_name: string, lecture_time: string }) => ({
                request_id: newRequestId,
                subject_name: lec.subject_name,
                lecture_time: lec.lecture_time,
            }));

            const { error: lecturesError } = await supabase
                .from('request_lectures')
                .insert(lectureData);

            if (lecturesError) {
                 console.error(`[${timestamp}] [createRequest] FAILED - Error inserting lectures:`, lecturesError);
                // Log and continue, as the main request was created.
                console.warn(`[${timestamp}] [createRequest] Request ${newRequestId} created, but failed to insert associated lectures.`);
            } else {
                console.log(`[${timestamp}] [createRequest] Lectures inserted successfully.`);
            }
        }
        // --- End Insert Lectures ---


        // --- Fetch Full Request Data to Return ---
        console.log(`[${timestamp}] [createRequest] Fetching full data for new request ${newRequestId}...`);
         const { data: finalRequestData, error: finalRequestError } = await supabase
            .from('requests')
            // Fetch necessary fields for the immediate response
            // ✨ FIX: Explicitly specify relationship for current_approver
             .select(`
                *,
                current_approver:profiles!requests_current_approver_id_fkey(full_name)
             `)
            .eq('id', newRequestId)
            .single();

        if (finalRequestError) {
             console.error(`[${timestamp}] [createRequest] FAILED - Error fetching final request data:`, finalRequestError);
            // Send success but maybe with a warning
            return res.status(201).json({ message: "Request created, but failed to fetch full details for response.", requestId: newRequestId });
        }
        // --- End Fetch Full Data ---


        console.log(`[${timestamp}] [createRequest] END - Success. Returning request data.`);
        res.status(201).json({ message: "Request created successfully!", request: finalRequestData });

    } catch (error: any) {
        console.error(`[${timestamp}] [createRequest] FAILED (Outer Catch) - Error creating request:`, error.message || error);
        res.status(500).json({ message: error.message || "Server error while creating request." });
    }
};

// === GET MY REQUESTS (Includes Approver Name) ===
export const getMyRequests = async (req: Request, res: Response) => {
    // ... (getMyRequests implementation as updated previously) ...
     const studentId = req.user.id;
     const timestamp = new Date().toISOString();
     console.log(`[${timestamp}] [getMyRequests] Fetching requests for student ID: ${studentId}`);
     try {
         // ✨ FIX 2: Be explicit about ALL columns from 'requests' table AND the join
         const { data, error } = await supabase
             .from('requests')
             .select(`
                  id,
                  activity_name,
                  status,
                  created_at,
                  duration_type,
                  start_date,
                  end_date,
                  current_approver_id,
                  student_id,
                  justification_text,
                  attendance_snapshot,
                  attendance_screenshot_url,
                  current_approver:profiles!requests_current_approver_id_fkey( full_name )
             `)
             .eq('student_id', studentId)
             .order('created_at', { ascending: false });

         if (error) {
             console.error(`[${timestamp}] [getMyRequests] Supabase query error for ${studentId}:`, error);
             // Log the specific Supabase error details if available
             if (error.details) console.error(`[${timestamp}] [getMyRequests] Supabase error details:`, error.details);
             if (error.hint) console.error(`[${timestamp}] [getMyRequests] Supabase error hint:`, error.hint);
             throw error;
         }
         console.log(`[${timestamp}] [getMyRequests] Found ${data?.length || 0} requests for student ${studentId}.`);
         res.status(200).json(data || []); // Return empty array if data is null/undefined
     } catch (error: any) {
         console.error(`[${timestamp}] [getMyRequests] Controller error for ${studentId}:`, error.message || error);
         res.status(500).json({ message: error.message || "Server error while fetching requests." });
     } finally {
         console.log(`[${timestamp}] [getMyRequests] END - Request processing finished for ${studentId}.`);
     }
};


// === GET PENDING REQUESTS (Revised to use RPC with SECURITY DEFINER function) ===
export const getPendingRequests = async (req: Request, res: Response) => {
     const facultyId = req.user.id;
     const timestamp = new Date().toISOString();

     console.log(`[${timestamp}] [getPendingRequests] START - Calling RPC 'get_pending_requests_for_faculty_secure' for faculty ID: ${facultyId}`);

     try {
         // ✨ Call the PostgreSQL function using RPC
         const { data: requestsData, error: rpcError } = await supabase
             .rpc('get_pending_requests_for_faculty_secure', {
                 faculty_uuid: facultyId // Pass the faculty ID as an argument to the function
             });

         if (rpcError) {
             console.error(`[${timestamp}] [getPendingRequests] Supabase RPC call FAILED for ${facultyId}:`, rpcError);
             throw rpcError; // Let the outer catch handle
         }

         // The RPC function returns the data already joined with student info
         console.log(`[${timestamp}] [getPendingRequests] RPC call successful. Found ${requestsData?.length ?? 0} request(s) for faculty ${facultyId}.`);

         // Set cache headers
         res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
         res.setHeader('Pragma', 'no-cache');
         res.setHeader('Expires', '0');

         // Return the data fetched by the RPC function
         // Ensure it returns an empty array if data is null/undefined
         res.status(200).json(requestsData || []);

     } catch (error: any) {
         console.error(`[${timestamp}] [getPendingRequests] Controller error for ${facultyId}:`, error);
         res.status(500).json({ message: error.message || "Server error while fetching pending requests." });
     } finally {
         console.log(`[${timestamp}] [getPendingRequests] END - Request processing finished for ${facultyId}.`);
     }
};

// === PROCESS DECISION (Includes Routing Fix + Notifications) ===
// === PROCESS DECISION (Revised to create a fresh admin client locally) ===
export const processDecision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const approverId = req.user.id;
    const { decision, remarks } = req.body as { decision: 'APPROVED' | 'REJECTED', remarks?: string };

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] --- Processing Decision for Request ID: ${id} ---`);
    console.log(`[${timestamp}] Approver ID: ${approverId}, Decision: ${decision}`);

    // Basic validation
    if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) { return res.status(400).json({ message: "Invalid decision" }); }
    if (decision === 'REJECTED' && !remarks?.trim()) { return res.status(400).json({ message: "Remarks mandatory for rejection." }); }

    // ✨ Create a new Supabase client instance using the Service Role Key
    const localSupabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Now finds supabaseUrl/Key
    console.log(`[${timestamp}] Created local Supabase admin client instance for this request.`);


    try {
        // Step 1: Fetch basic request details (using local client)
        console.log(`[${timestamp}] Fetching request details (basic) for ID: ${id}...`);
        const { data: requestData, error: detailsError } = await localSupabaseAdmin
            .from('requests')
            .select('id, activity_name, status, student_id, current_approver_id')
            .eq('id', id)
            .single();

        if (detailsError) { /* ... handle error ... */ console.error(`[${timestamp}] Error fetching request details:`, detailsError); throw detailsError; }
        if (!requestData) { /* ... handle not found ... */ console.warn(`[${timestamp}] Request ID ${id} not found.`); return res.status(404).json({ message: "Request not found." }); }

        const currentStatus = requestData.status as request_status;
        const studentId = requestData.student_id;
        console.log(`[${timestamp}] Request ${id} found. Status: ${currentStatus}, Student ID: ${studentId}`);

        // Security Check
        if (requestData.current_approver_id !== approverId) { /* ... handle forbidden ... */ console.warn(`[${timestamp}] Auth Fail: User ${approverId} tried to process request ${id} assigned to ${requestData.current_approver_id}`); return res.status(403).json({ message: "Not authorized for this request now." }); }
        // Prevent re-processing
        if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED') { /* ... handle already processed ... */ console.warn(`[${timestamp}] Request ${id} already ${currentStatus}.`); return res.status(400).json({ message: `Request already ${currentStatus.toLowerCase()}.` }); }

        // Step 2: Fetch student profile (using local client)
        console.log(`[${timestamp}] Fetching profile for student ID: ${studentId}...`);
        const { data: studentProfileData, error: profileError } = await localSupabaseAdmin
            .from('profiles')
            .select('id, full_name, class_coordinator_id, academic_coordinator_id, hod_id')
            .eq('id', studentId)
            .single();

        if (profileError || !studentProfileData) {
            console.error(`[${timestamp}] Student profile not found for ID ${studentId}:`, profileError?.message || 'Profile data is null');
            return res.status(404).json({ message: "Student profile associated with the request not found." });
        }
        const studentProfile = studentProfileData as Profile;
        console.log(`[${timestamp}] Student profile found: ${studentProfile.full_name}`);

        // Step 3: Fetch student email (using local client)
        console.log(`[${timestamp}] Fetching email for student ID: ${studentProfile.id}...`);
        const { data: authUser, error: authError } = await localSupabaseAdmin.auth.admin.getUserById(studentProfile.id);
        const studentEmail = authUser?.user?.email;
        if (!studentEmail) { console.warn(`[${timestamp}] Warning - Student email not found for ID ${studentProfile.id}.`); }
        else { console.log(`[${timestamp}] Student email found: ${studentEmail}`); }


        console.log(`[${timestamp}] Logging approval step...`);
        // Step 4: Log decision (using local client)
        const { error: logError } = await localSupabaseAdmin.from('approval_steps').insert({
            request_id: parseInt(id, 10),
            approver_id: approverId,
            status: decision,
            remarks: remarks || null
        });
        if (logError) { /* ... handle error ... */ console.error(`[${timestamp}] Error logging approval step:`, logError); throw logError; }
        console.log(`[${timestamp}] Approval step logged successfully.`);

        // --- Define Workflow ---
        const APPROVAL_WORKFLOW = ['CONCERNED_AUTHORITY', 'CLASS_COORDINATOR', 'ACADEMIC_COORDINATOR', 'HOD'];

        // --- Process Rejection ---
        if (decision === 'REJECTED') {
            console.log(`[${timestamp}] Processing REJECTION for request ${id}...`);
            const { data: rejectedRequestData, error: rejectError } = await localSupabaseAdmin
                .from('requests')
                .update({ status: 'REJECTED', current_approver_id: null })
                .eq('id', id)
                .select()
                .single();
            if (rejectError) { /* ... */ throw rejectError; }
            console.log(`[${timestamp}] Request ${id} status updated to REJECTED.`);
            // Send notification
            if (studentEmail) {
                try {
                    // ✨ FIX: Restore email options
                    await sendEmail({
                         to: studentEmail,
                         subject: `Update on Your Classwork Request (#${id})`,
                         text: `Dear ${studentProfile.full_name},\n\nYour classwork request for the activity "${requestData.activity_name}" has been rejected.\nReason: ${remarks}\nPlease log in to the portal for details.`,
                         html: `<p>Dear ${studentProfile.full_name},</p><p>Your classwork request (#${id}) for the activity "<strong>${requestData.activity_name}</strong>" has been <strong>rejected</strong>.</p><p><strong>Reason:</strong> ${remarks}</p><p>Please log in to the portal for details.</p>`
                    });
                    console.log(`[${timestamp}] Rejection email sent.`);
                } catch (e: any) { console.error(`[${timestamp}] FAILED sending rejection email:`, e.message); }
            } else { console.warn(`[${timestamp}] Cannot send rejection email: Student email missing.`); }
            return res.status(200).json({ message: "Request rejected successfully.", request: rejectedRequestData });
        }

        // --- Process Approval ---
        if (decision === 'APPROVED') {
            console.log(`[${timestamp}] Processing APPROVAL for request ${id}...`);
            // Get approver role
            const { data: approverProfileData, error: approverProfileError } = await localSupabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', approverId)
                .single();
            if (approverProfileError || !approverProfileData) { /* ... */ return res.status(404).json({ message: "Approver profile not found." }); }
            const approverRole = approverProfileData.role;
            console.log(`[${timestamp}] Current approver role: ${approverRole}`);

            let nextApproverId: string | null = null;
            let nextStatus: request_status = 'UNDER_REVIEW';
            let message = '';
            let nextApproverRoleName = '';

            // --- Handle HOD Exception Approval ---
            if (approverRole === 'HOD' && currentStatus === 'PENDING_HOD_EXCEPTION') {
                const firstApproverRole = APPROVAL_WORKFLOW[0];
                let firstApproverId: string | null = null;
                if (firstApproverRole === 'CONCERNED_AUTHORITY') {
                     console.warn(`[${timestamp}] HOD Ex approved. Routing logic might need adjustment for CONCERNED_AUTHORITY.`);
                     firstApproverId = studentProfile.class_coordinator_id || null; // Defaulting to CC
                } else if (firstApproverRole === 'CLASS_COORDINATOR') {
                    firstApproverId = studentProfile.class_coordinator_id || null;
                }
                if (!firstApproverId) { return res.status(500).json({ message: `Config error: Could not find ${firstApproverRole}` }); }
                nextApproverId = firstApproverId;
                nextStatus = 'UNDER_REVIEW';
                message = `Exception approved by HOD. Forwarded to ${firstApproverRole.replace('_', ' ')}.`;
                nextApproverRoleName = firstApproverRole.replace('_', ' ');
                console.log(`[${timestamp}] Forwarding exception request ${id} to ${nextApproverRoleName} ID: ${nextApproverId}`);

            // --- Handle Standard Approval Workflow ---
            } else {
                 const currentIndex = APPROVAL_WORKFLOW.indexOf(approverRole);
                 if (currentIndex === -1) { return res.status(500).json({ message: `Config error: Role ${approverRole} not in workflow.` }); }
                 if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
                     nextStatus = 'APPROVED';
                     nextApproverId = null;
                     message = "Request fully approved!";
                 } else {
                     const nextRoleEnum = APPROVAL_WORKFLOW[currentIndex + 1];
                     nextApproverRoleName = nextRoleEnum.replace('_', ' ');
                     if (nextRoleEnum === 'CLASS_COORDINATOR') { nextApproverId = studentProfile.class_coordinator_id || null; }
                     else if (nextRoleEnum === 'ACADEMIC_COORDINATOR') { nextApproverId = studentProfile.academic_coordinator_id || null; }
                     else if (nextRoleEnum === 'HOD') { nextApproverId = studentProfile.hod_id || null; }
                     if (!nextApproverId) { return res.status(500).json({ message: `Config error: Failed to find ${nextRoleEnum}` }); }
                     nextStatus = 'UNDER_REVIEW';
                     message = `Request approved and forwarded to ${nextApproverRoleName}.`;
                 }
            } // --- End Workflow Logic ---


            // --- Update Request Table ---
            console.log(`[${timestamp}] Updating request ${id} status: ${nextStatus}, next approver: ${nextApproverId || 'None'}`);
            const { data: updatedRequestData, error: updateError } = await localSupabaseAdmin
                .from('requests')
                .update({ status: nextStatus, current_approver_id: nextApproverId })
                .eq('id', id)
                .select()
                .single();
            if (updateError) { /* ... */ throw updateError; }
            console.log(`[${timestamp}] Request ${id} update successful.`);

            // --- Send Notifications ---
            // Notify Student on FINAL Approval
            if (nextStatus === 'APPROVED' && studentEmail) {
                try {
                    // ✨ FIX: Restore email options
                    await sendEmail({
                        to: studentEmail,
                        subject: `Your Classwork Request (#${id}) has been Approved!`,
                        text: `Dear ${studentProfile.full_name},\n\nCongratulations! Your classwork request for the activity "${requestData.activity_name}" has been fully approved.`,
                        html: `<p>Dear ${studentProfile.full_name},</p><p>Congratulations! Your classwork request (#${id}) for the activity "<strong>${requestData.activity_name}</strong>" has been <strong>fully approved</strong>.</p>`
                    });
                    console.log(`[${timestamp}] Final approval email sent.`);
                 } catch (e: any) { console.error(`[${timestamp}] FAILED sending final approval email:`, e.message); }
            } else if (nextStatus === 'APPROVED'){ console.warn(`[${timestamp}] Cannot send final approval email: Student email missing.`); }

            // Notify NEXT Approver
            if (nextApproverId) {
                 try {
                     // Fetch next approver details
                     const { data: nextApproverProfileData } = await localSupabaseAdmin.from('profiles').select('id, full_name').eq('id', nextApproverId).single();
                     if (!nextApproverProfileData) throw new Error(`Next approver profile ${nextApproverId} not found`);
                     const { data: nextAuthUser } = await localSupabaseAdmin.auth.admin.getUserById(nextApproverId);
                     if (!nextAuthUser?.user?.email) throw new Error(`Email not found for next approver ${nextApproverId}`);
                     const nextApproverEmail = nextAuthUser.user.email;
                     // Send email
                     // ✨ FIX: Restore email options
                     await sendEmail({
                         to: nextApproverEmail,
                         subject: `New Classwork Request (#${id}) for Your Approval`,
                         text: `Dear ${nextApproverProfileData.full_name},\n\nA classwork request from ${studentProfile.full_name} for activity "${requestData.activity_name}" requires your approval.`,
                         html: `<p>Dear ${nextApproverProfileData.full_name},</p><p>A classwork request (#${id}) from <strong>${studentProfile.full_name}</strong> for activity "<strong>${requestData.activity_name}</strong>" requires your approval. Please log in to review.</p>`
                     });
                     console.log(`[${timestamp}] Notification email sent to next approver ${nextApproverEmail}.`);
                 } catch (emailError: any) {
                     console.error(`[${timestamp}] FAILED sending forwarding notification email:`, emailError.message || emailError);
                 }
            }
             // --- End Notifications ---

            return res.status(200).json({ message: message, request: updatedRequestData });
        } // --- End Process Approval ---

    } catch (error: any) {
        console.error(`[${timestamp}] Process Decision Error (Outer Catch) for Request ID ${id}:`, error.message || error);
        res.status(500).json({ message: "Server error while processing decision." });
    } finally {
         console.log(`[${timestamp}] [processDecision] END - Processing finished for request ${id}.`);
    }
};

// === GET REQUEST BY ID (Revised to use RPC with SECURITY DEFINER function) ===
export const getRequestById = async (req: Request, res: Response) => {
     const { id } = req.params;
     const userId = req.user.id; // ID of the user requesting the details
     const timestamp = new Date().toISOString();
     console.log(`[${timestamp}] [getRequestById] START - Calling RPC 'get_request_details_secure' for request ID: ${id} by user: ${userId}`);

     // Convert id from params (string) to integer for the SQL function
     const requestIdInt = parseInt(id, 10);
     if (isNaN(requestIdInt)) {
          console.warn(`[${timestamp}] [getRequestById] FAILED - Invalid request ID format: ${id}`);
          return res.status(400).json({ message: "Invalid request ID format." });
     }


     try {
         // ✨ Call the PostgreSQL function using RPC
         // Pass arguments matching the SQL function parameter names.
         const { data: requestDetailsJson, error: rpcError } = await supabase
             .rpc('get_request_details_secure', {
                 request_id_param: requestIdInt,     // Pass integer request ID
                 requesting_user_id: userId        // Pass UUID of user making the request
             }); // RPC returns the single JSON object directly

         if (rpcError) {
             console.error(`[${timestamp}] [getRequestById] Supabase RPC call FAILED for request ${id}:`, rpcError);
             // Handle potential permission errors raised by the function (if configured)
             if (rpcError.message.includes('Forbidden')) {
                  return res.status(403).json({ message: "You are not authorized to view this request." });
             }
             throw rpcError; // Let the outer catch handle other errors
         }

         // Check if the function returned null (request not found by the function)
         if (!requestDetailsJson) {
             console.log(`[${timestamp}] [getRequestById] RPC call returned null (Request ID ${id} not found or permission denied by function logic).`);
             return res.status(404).json({ message: "Request not found or access denied." });
         }

         // Check if the JSON object itself contains an error message (from our SQL function logic)
         if (requestDetailsJson.error) {
              console.warn(`[${timestamp}] [getRequestById] RPC function returned error for request ${id}: ${requestDetailsJson.error}`);
              return res.status(403).json({ message: requestDetailsJson.error }); // Return specific error from function
         }


         // The RPC function returns the fully formed JSON object
         console.log(`[${timestamp}] [getRequestById] RPC call successful for request ${id}.`);

         // Cast the JSON result to the expected frontend type
         const responseData = requestDetailsJson as ClassworkRequest;

         // Ensure nested arrays are present, even if empty (SQL function uses COALESCE for this)
         responseData.lectures = responseData.lectures || [];
         responseData.approvalHistory = responseData.approvalHistory || [];


         res.status(200).json(responseData);

     } catch (error: any) {
         console.error(`[${timestamp}] [getRequestById] Controller error for request ID ${id}:`, error.message || error);
         res.status(500).json({ message: error.message || "Server error while fetching request details." });
     } finally {
          console.log(`[${timestamp}] [getRequestById] END - Processing finished for request ID ${id}.`);
     }
};


// === GET FACULTY PROFILES ===
export const getFacultyProfiles = async (req: Request, res: Response) => {
    // ... (getFacultyProfiles implementation as before) ...
     try {
         const { data, error } = await supabase
             .from('profiles')
             .select('id, full_name, role')
             .neq('role', 'STUDENT')
              .order('full_name', { ascending: true }); // Optional: order alphabetically

         if (error) throw error;

         res.status(200).json(data || []); // Return empty array if null
     } catch (error: any) {
         console.error('Get Faculty Profiles Error:', error);
         res.status(500).json({ message: error.message || "Server error while fetching faculty profiles." });
     }
};

