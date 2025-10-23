import { Request, Response } from 'express';
// Use the correct import alias 'supabase' for the admin client
import { supabaseAdmin as supabase } from '../config/supabaseClient';
import { sendEmail } from "../utils/mailer";
import { Profile, ClassworkRequest, ApprovalStep, Lecture } from '../types'; // Ensure all relevant types are imported

// Mock ERP Function: Simulates fetching a student's attendance.
// --- ORIGINAL Mock ERP Function (Random Percentage) ---
const getMockAttendance = (studentId: string) => {
    // Log that we are using the simple mock
    console.log(`[getMockAttendance] Using SIMPLE RANDOM mock for student ID: ${studentId}`);

    // 80% chance of being eligible
    const isEligible = Math.random() > 0.2;
    const overallAverage = isEligible ? Math.floor(Math.random() * 25) + 75 : Math.floor(Math.random() * 20) + 55;

    // Return the basic structure needed by createRequest
    return {
        overallAverage: overallAverage,
        // Provide an empty array for subject_breakdown as the DB version did
        subject_breakdown: []
    };
};

// This defines the sequence of approvals.
const APPROVAL_WORKFLOW = ['CONCERNED_AUTHORITY', 'CLASS_COORDINATOR', 'ACADEMIC_COORDINATOR', 'HOD'];

export const createRequest = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    const {
        activity_name,
        duration_type,
        start_date,
        end_date,
        lectures,
        justification_text,
        concerned_authority_id
    } = req.body;

    if (!activity_name || !duration_type || !concerned_authority_id) {
        return res.status(400).json({ message: "Activity name, duration type, and concerned authority are required." });
    }

    try {
        const attendance = getMockAttendance(studentId);
        let status: 'PENDING' | 'PENDING_HOD_EXCEPTION' = 'PENDING';
        let current_approver_id: string | null = concerned_authority_id;

        if (attendance.overallAverage < 75) {
            if (!justification_text) {
                return res.status(402).json({
                    message: "Attendance is below 75%. Justification is required.",
                    attendance: attendance.overallAverage
                });
            }
            status = 'PENDING_HOD_EXCEPTION';
            const { data: hod } = await supabase.from('profiles').select('id').eq('role', 'HOD').limit(1).single();
            if (!hod) return res.status(404).json({ message: "HOD profile not found to assign exception request." });
            current_approver_id = hod.id;
        }

        const { data: newRequest, error: requestError } = await supabase
            .from('requests')
            .insert({
                student_id: studentId,
                activity_name,
                duration_type,
                start_date,
                end_date,
                status,
                justification_text,
                current_approver_id: current_approver_id
            })
            .select('id') // Select only the ID initially
            .single();

        if (requestError) throw requestError;
        if (!newRequest?.id) throw new Error("Failed to retrieve new request ID after insert.");


        if (duration_type === 'SINGLE_DAY' && lectures && lectures.length > 0) {
            const lectureData = lectures.map((lec: { subject_name: string, lecture_time: string }) => ({
                request_id: newRequest.id,
                subject_name: lec.subject_name,
                lecture_time: lec.lecture_time,
            }));

            const { error: lecturesError } = await supabase
                .from('request_lectures')
                .insert(lectureData);

            if (lecturesError) throw lecturesError;
        }

        // Fetch the full request data again to return to the client
         const { data: finalRequestData, error: finalRequestError } = await supabase
            .from('requests')
            .select('*')
            .eq('id', newRequest.id)
            .single();

        if (finalRequestError) throw finalRequestError;


        res.status(201).json({ message: "Request created successfully!", request: finalRequestData });

    } catch (error: any) {
        console.error('Create Request Error:', error);
        res.status(500).json({ message: error.message || "Server error while creating request." });
    }
};

// === GET ALL REQUESTS FOR THE LOGGED-IN STUDENT ===
export const getMyRequests = async (req: Request, res: Response) => {
    const studentId = req.user.id;
    try {
        const { data, error } = await supabase // Use the alias 'supabase'
            .from('requests')
            .select('*') // Keep this simple for the student dashboard list
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error: any) {
        console.error('Get My Requests Error:', error);
        res.status(500).json({ message: error.message || "Server error while fetching requests." });
    }
};

// === GET ALL PENDING REQUESTS FOR FACULTY/HOD REVIEW (REVISED + CACHE CONTROL + SEPARATE QUERIES) ===
export const getPendingRequests = async (req: Request, res: Response) => {
    const facultyId = req.user.id;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [getPendingRequests] START - Fetching requests for faculty ID: ${facultyId}`);

    try {
        // Step 1: Fetch the basic request data assigned to this faculty
        const { data: requestsData, error: requestError } = await supabase
            .from('requests')
            .select('*') // Select all columns from requests table
            .eq('current_approver_id', facultyId)
            .in('status', ['PENDING', 'UNDER_REVIEW', 'PENDING_HOD_EXCEPTION'])
            .order('created_at', { ascending: true });

        if (requestError) {
            console.error(`[${timestamp}] [getPendingRequests] Supabase query FAILED for ${facultyId}:`, requestError);
            throw requestError;
        }

        if (!requestsData || requestsData.length === 0) {
             console.log(`[${timestamp}] [getPendingRequests] No matching requests found in DB for ${facultyId}.`);
             res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
             res.setHeader('Pragma', 'no-cache');
             res.setHeader('Expires', '0');
             return res.status(200).json([]); // Return empty array if no requests found
        }
        console.log(`[${timestamp}] [getPendingRequests] Found ${requestsData.length} request(s) for faculty ${facultyId}. IDs: ${requestsData.map(r => r.id).join(', ')}`);


        // Step 2: Extract unique student IDs from the requests
        const studentIds = [...new Set(requestsData.map(r => r.student_id))].filter(id => id); // Filter out potential nulls
        if (studentIds.length === 0) {
             console.log(`[${timestamp}] [getPendingRequests] No valid student IDs found in requests.`);
             res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
             res.setHeader('Pragma', 'no-cache');
             res.setHeader('Expires', '0');
             return res.status(200).json(requestsData); // Return requests without student data if none found
        }
        console.log(`[${timestamp}] [getPendingRequests] Fetching profiles for student IDs: ${studentIds.join(', ')}`);


        // Step 3: Fetch the profiles for these students in a separate query
        const { data: profilesData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, college_id')
            .in('id', studentIds);

         if (profileError) {
            console.error(`[${timestamp}] [getPendingRequests] Supabase profile query FAILED:`, profileError);
            throw profileError;
        }
        console.log(`[${timestamp}] [getPendingRequests] Successfully fetched ${profilesData?.length ?? 0} profiles.`);


        // Step 4: Combine the request data with the profile data (Map profiles by ID for easy lookup)
         const profilesMap = new Map<string, Partial<Profile>>();
         profilesData?.forEach(p => profilesMap.set(p.id, p));

         const combinedData = requestsData.map(request => ({
             ...request,
             // Attach the student profile, defaulting if not found
             student: profilesMap.get(request.student_id) || null
         }));

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json(combinedData);

    } catch (error: any) {
        console.error(`[${timestamp}] [getPendingRequests] Controller error for ${facultyId}:`, error);
        res.status(500).json({ message: error.message || "Server error while fetching pending requests." });
    } finally {
        console.log(`[${timestamp}] [getPendingRequests] END - Request processing finished for ${facultyId}.`);
    }
};


// === PROCESS AN APPROVAL OR REJECTION DECISION (REVISED + SEPARATE QUERIES) ===
export const processDecision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const approverId = req.user.id;
    const { decision, remarks } = req.body;

    console.log(`--- Processing Decision for Request ID: ${id} ---`);
    console.log(`Approver ID: ${approverId}, Decision: ${decision}`);

    if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) { /* Handle error */ return res.status(400).json({ message: "A valid decision ('APPROVED' or 'REJECTED') is required." }); }

    try {
        console.log('Fetching request details (basic)...');
        // Step 1: Fetch basic request details
        const { data: requestData, error: detailsError } = await supabase
            .from('requests')
            .select('activity_name, status, student_id') // Select only needed fields initially
            .eq('id', id)
            .single();

        if (detailsError) { /* Handle error */ throw detailsError; }
        if (!requestData) { /* Handle error */ return res.status(404).json({ message: "Request not found." }); }

        const currentStatus = requestData.status;
        const studentId = requestData.student_id;

        // Step 2: Fetch student profile separately
        console.log(`Fetching profile for student ID: ${studentId}...`);
        const { data: studentProfileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name') // Select necessary fields
            .eq('id', studentId)
            .single();

        if (profileError || !studentProfileData) {
            console.error(`Student profile not found for ID ${studentId}:`, profileError);
            return res.status(404).json({ message: "Student profile associated with the request not found." });
        }
        const studentProfile = studentProfileData as Profile; // Cast here

        // Step 3: Fetch student email separately
        console.log(`Fetching email for student ID: ${studentProfile.id}...`);
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(studentProfile.id);
        if (authError || !authUser?.user?.email) { /* Handle error */ return res.status(500).json({ message: "Could not retrieve student email." }); }
        const studentEmail = authUser.user.email;
        console.log(`Request found. Status: ${currentStatus}, Student: ${studentProfile.full_name}, Email: ${studentEmail}`);

        console.log('Step 4: Logging action...');
        const { error: logError } = await supabase.from('approval_steps').insert({
             request_id: id,
             approver_id: approverId,
             status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
             remarks: remarks
         });
        if (logError) { /* Handle error */ throw logError; }
        console.log('Action logged.');

        // Step 5: Process Rejection
        if (decision === 'REJECTED') {
            console.log('Processing REJECTION...');
            const { data, error } = await supabase.from('requests').update({ status: 'REJECTED', current_approver_id: null }).eq('id', id).select();
            if (error) { /* Handle error */ throw error; }
            console.log('Request REJECTED.');
            if (studentEmail) { await sendEmail({
                 to: studentEmail,
                 subject: "Update on Your Classwork Request",
                 text: `Dear ${studentProfile.full_name},\n\nYour classwork request for the activity "${requestData.activity_name}" has been rejected. Please log in to the portal to view the remarks.`,
                 html: `<p>Dear ${studentProfile.full_name},</p><p>Your classwork request for the activity "<strong>${requestData.activity_name}</strong>" has been <strong>rejected</strong>. Please log in to the portal to view the remarks.</p>`
            }); console.log('Rejection email sent.'); }
            return res.status(200).json({ message: "Request rejected.", request: data });
        }

        // Step 6: Process Approval
        if (decision === 'APPROVED') {
            console.log('Processing APPROVAL...');
            const { data: approverProfileData } = await supabase.from('profiles').select('role').eq('id', approverId).single();
            const approverProfile = approverProfileData as unknown as Profile;
            if (!approverProfile) { /* Handle error */ return res.status(404).json({ message: "Approver profile not found." }); }
            console.log(`Approver role: ${approverProfile.role}`);

            if (approverProfile.role === 'HOD' && currentStatus === 'PENDING_HOD_EXCEPTION') {
                console.log('HOD approving exception...');
                const firstApproverRole = APPROVAL_WORKFLOW[0];
                const { data: firstApproverData } = await supabase.from('profiles').select('id, full_name').eq('role', firstApproverRole).limit(1).single();
                const firstApprover = firstApproverData as unknown as Profile;
                if (!firstApprover) { /* Handle error */ return res.status(404).json({ message: `No user found for role: ${firstApproverRole}` }); }

                const { data: firstAuthUser, error: firstAuthErr } = await supabase.auth.admin.getUserById(firstApprover.id);
                 if (firstAuthErr || !firstAuthUser?.user?.email) { /* Handle error */ return res.status(500).json({ message: "Could not retrieve first approver email." }); }
                const firstApproverEmail = firstAuthUser.user.email;

                const { data, error } = await supabase.from('requests').update({ status: 'UNDER_REVIEW', current_approver_id: firstApprover.id }).eq('id', id).select();
                if (error) { /* Handle error */ throw error;}

                if (firstApproverEmail) { // Use fetched email
                    await sendEmail({
                        to: firstApproverEmail,
                        subject: "New Classwork Request for Your Approval",
                        text: `Dear ${firstApprover.full_name},\n\nA classwork request from ${studentProfile.full_name} for the activity "${requestData.activity_name}" has been forwarded to you for approval (exception approved by HOD). Please log in to the portal to review it.`,
                        html: `<p>Dear ${firstApprover.full_name},</p><p>A classwork request from <strong>${studentProfile.full_name}</strong> for the activity "<strong>${requestData.activity_name}</strong>" has been forwarded to you for approval (exception approved by HOD). Please log in to the portal to review it.</p>`
                    });
                }
                return res.status(200).json({ message: `Exception approved. Forwarded to ${firstApproverRole}.`, request: data });
            }

            const currentIndex = APPROVAL_WORKFLOW.indexOf(approverProfile.role);
            console.log(`Current index: ${currentIndex}`);
            if (currentIndex === -1) { /* Handle error */ return res.status(500).json({ message: "Approver role not recognized." });}

            if (currentIndex === APPROVAL_WORKFLOW.length - 1) {
                console.log('Final approval.');
                const { data, error } = await supabase.from('requests').update({ status: 'APPROVED', current_approver_id: null }).eq('id', id).select();
                if (error) { /* Handle error */ throw error;}
                console.log('Request APPROVED.');
                if (studentEmail) { await sendEmail({
                    to: studentEmail,
                    subject: "Your Classwork Request has been Approved!",
                    text: `Dear ${studentProfile.full_name},\n\nCongratulations! Your classwork request for the activity "${requestData.activity_name}" has been fully approved.`,
                    html: `<p>Dear ${studentProfile.full_name},</p><p>Congratulations! Your classwork request for the activity "<strong>${requestData.activity_name}</strong>" has been <strong>fully approved</strong>.</p>`
                }); console.log('Final approval email sent.'); }
                return res.status(200).json({ message: "Request fully approved!", request: data });
            } else {
                console.log('Forwarding to next approver...');
                const nextApproverRole = APPROVAL_WORKFLOW[currentIndex + 1];
                console.log(`Next role: ${nextApproverRole}`);

                try {
                    console.log(`Finding user with role ${nextApproverRole}...`);
                    const { data: nextApproverData, error: findError } = await supabase.from('profiles').select('id, full_name').eq('role', nextApproverRole).limit(1).single();
                    if(findError) throw findError;

                    const nextApprover = nextApproverData as unknown as Profile;
                    if (!nextApprover) {
                        console.error(`Next approver role (${nextApproverRole}) not found.`);
                        return res.status(404).json({ message: `No user found for the next role: ${nextApproverRole}` });
                    }
                    console.log(`Found next approver: ${nextApprover.full_name}`);

                    console.log(`Fetching email for next approver ID: ${nextApprover.id}...`);
                    const { data: nextAuthUser, error: nextAuthError } = await supabase.auth.admin.getUserById(nextApprover.id);
                    if (nextAuthError || !nextAuthUser?.user?.email) {
                        console.error(`Error fetching email for next approver ${nextApprover.id}:`, nextAuthError);
                        return res.status(500).json({ message: "Could not retrieve next approver email for notification." });
                    }
                    const nextApproverEmail = nextAuthUser.user.email;
                    console.log(`Next approver email: ${nextApproverEmail}`);

                    console.log(`Updating request ${id} to UNDER_REVIEW and assigning...`);
                    const { data, error: updateError } = await supabase.from('requests').update({ status: 'UNDER_REVIEW', current_approver_id: nextApprover.id }).eq('id', id).select();
                    if (updateError) throw updateError;
                    console.log('Request update successful.');

                    console.log(`Sending notification email to ${nextApprover.full_name}...`);
                    if (nextApproverEmail) { // Use fetched email
                        await sendEmail({
                            to: nextApproverEmail,
                            subject: "New Classwork Request for Your Approval",
                            text: `Dear ${nextApprover.full_name},\n\nA classwork request from ${studentProfile.full_name} for the activity "${requestData.activity_name}" has been forwarded to you for approval. Please log in to the portal to review it.`,
                            html: `<p>Dear ${nextApprover.full_name},</p><p>A classwork request from <strong>${studentProfile.full_name}</strong> for the activity "<strong>${requestData.activity_name}</strong>" has been forwarded to you for approval. Please log in to the portal to review it.</p>`
                         });
                        console.log('Notification email sent.');
                    } else {
                        console.warn(`Could not send forwarding notification email for request ${id}: Next approver email not found.`);
                    }
                    return res.status(200).json({ message: `Request approved and forwarded to ${nextApproverRole}.`, request: data });

                } catch (forwardingError: any) {
                    console.error('Error during forwarding step:', forwardingError.message || forwardingError);
                    return res.status(500).json({ message: `Error forwarding request: ${forwardingError.message}` });
                }
            }
        }
    } catch (error: any) {
        console.error('Process Decision Error (Outer Catch):', error.message || error);
        res.status(500).json({ message: error.message || "Server error while processing decision." });
    }
};

// === GET A SINGLE REQUEST BY ITS ID WITH FULL DETAILS (REVISED + SEPARATE QUERIES + LOGGING) ===
export const getRequestById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [getRequestById] START - Fetching details for request ID: ${id} by user: ${userId}`);

    try {
        // Step 1: Fetch the main request data
        console.log(`[${timestamp}] [getRequestById] Fetching main request data...`);
        const { data: request, error: requestError } = await supabase
            .from('requests')
            .select('*') // Select all base fields
            .eq('id', id)
            .single();

        if (requestError) {
             console.error(`[${timestamp}] [getRequestById] Error fetching main request data:`, requestError);
             throw requestError;
        }
        if (!request) {
             console.log(`[${timestamp}] [getRequestById] Request ID ${id} not found.`);
             return res.status(404).json({ message: "Request not found." });
        }
         console.log(`[${timestamp}] [getRequestById] Found request data for ID ${id}. Student ID: ${request.student_id}`);


        // Security check
        const userRole = req.user?.app_metadata?.role ?? req.user?.user_metadata?.role;
        console.log(`[${timestamp}] [getRequestById] Requester role: ${userRole}, Request student ID: ${request.student_id}, Requester ID: ${userId}`);
        if (userRole === 'STUDENT' && request.student_id !== userId) {
            console.warn(`[${timestamp}] [getRequestById] Authorization failed for student ${userId} trying to access request ${id}`);
            return res.status(403).json({ message: "You are not authorized to view this request." });
        }

         // Step 2: Fetch student profile separately
         console.log(`[${timestamp}] [getRequestById] Fetching student profile for ID: ${request.student_id}...`);
         const { data: studentProfileData, error: studentProfileError } = await supabase
            .from('profiles')
            .select('*') // Select all profile fields needed
            .eq('id', request.student_id)
            .single();
         if (studentProfileError) {
             console.error(`[${timestamp}] [getRequestById] Error fetching student profile:`, studentProfileError);
             throw studentProfileError;
         }
         if (!studentProfileData) {
             console.warn(`[${timestamp}] [getRequestById] Student profile not found for ID: ${request.student_id}.`);
             // Decide: Return 404 or return request without student details? Let's return 404 for consistency.
             return res.status(404).json({ message: "Student profile associated with this request not found."});
         }
          console.log(`[${timestamp}] [getRequestById] Found student profile: ${studentProfileData.full_name}`);


        // Step 3: Fetch lectures if needed
        let lectures: Lecture[] = [];
        if (request.duration_type === 'SINGLE_DAY') {
            console.log(`[${timestamp}] [getRequestById] Fetching lectures for request ID: ${id}...`);
            const { data: lectureData, error: lecturesError } = await supabase.from('request_lectures').select('*').eq('request_id', id);
            if (lecturesError) {
                 console.error(`[${timestamp}] [getRequestById] Error fetching lectures:`, lecturesError);
                 throw lecturesError;
            }
            lectures = lectureData || [];
            console.log(`[${timestamp}] [getRequestById] Found ${lectures.length} lectures.`);
        }

        // Step 4: Fetch approval history separately and then fetch approver profiles
         console.log(`[${timestamp}] [getRequestById] Fetching approval history steps for request ID: ${id}...`);
         const { data: historySteps, error: historyError } = await supabase
            .from('approval_steps')
            .select('*') // Select base history fields
            .eq('request_id', id)
            .order('created_at', { ascending: true });

        if (historyError) {
            console.error(`[${timestamp}] [getRequestById] Error fetching history steps:`, historyError);
            throw historyError;
        }

        let approvalHistory: (ApprovalStep & { approver: Partial<Profile> })[] = [];
         if (historySteps && historySteps.length > 0) {
            console.log(`[${timestamp}] [getRequestById] Found ${historySteps.length} history steps. Fetching approver profiles...`);
            const approverIds = [...new Set(historySteps.map(step => step.approver_id))].filter(id => id); // Filter out nulls
             if (approverIds.length > 0) {
                 console.log(`[${timestamp}] [getRequestById] Approver IDs to fetch: ${approverIds.join(', ')}`);
                 const { data: approverProfilesData, error: approverProfilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, role')
                    .in('id', approverIds);

                if (approverProfilesError) {
                    console.error(`[${timestamp}] [getRequestById] Error fetching approver profiles:`, approverProfilesError);
                    throw approverProfilesError;
                }
                 console.log(`[${timestamp}] [getRequestById] Found ${approverProfilesData?.length ?? 0} approver profiles.`);

                const approverMap = new Map<string, Partial<Profile>>();
                approverProfilesData?.forEach(p => approverMap.set(p.id, p));

                approvalHistory = historySteps.map(step => ({
                    ...step,
                    approver: approverMap.get(step.approver_id) || { full_name: 'Unknown User', role: 'UNKNOWN' } // Provide fallback
                }));
             } else {
                 console.log(`[${timestamp}] [getRequestById] No valid approver IDs found in history steps.`);
                 // Assign empty approver if IDs were null/invalid
                  approvalHistory = historySteps.map(step => ({
                    ...step,
                    approver: { full_name: 'Unknown User', role: 'UNKNOWN' }
                }));
             }
        } else {
             console.log(`[${timestamp}] [getRequestById] No approval history steps found for request ID: ${id}.`);
        }


        // Step 5: Combine all data
        console.log(`[${timestamp}] [getRequestById] Successfully assembled data for request ${id}. Sending response.`);
        res.status(200).json({
            ...request,
            student: studentProfileData, // Attach fetched student profile
            lectures,
            approvalHistory,
        });
    } catch (error: any) {
        console.error(`[${timestamp}] [getRequestById] Error for request ID ${id}:`, error.message || error);
        res.status(500).json({ message: error.message || "Server error while fetching request details." });
    } finally {
         console.log(`[${timestamp}] [getRequestById] END - Processing finished for request ID: ${id}.`);
    }
};


// === GET ALL FACULTY PROFILES ===
export const getFacultyProfiles = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase // Use alias
            .from('profiles')
            .select('id, full_name, role')
            .neq('role', 'STUDENT');

        if (error) throw error;

        res.status(200).json(data);
    } catch (error: any) {
        console.error('Get Faculty Profiles Error:', error);
        res.status(500).json({ message: error.message || "Server error while fetching faculty profiles." });
    }
};

