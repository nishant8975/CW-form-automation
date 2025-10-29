import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
// ✨ FIX: Use standard relative paths from pages/faculty/
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { supabase } from '../../config/supabaseFrontendClient'; // Assuming config is at src/config

// ✨ FIX: Use standard relative paths from pages/faculty/
import { Button } from '../../components/ui/button'; // Assuming components/ui is at src/components/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { StatusBadge } from '../../components/StatusBadge'; // Assuming StatusBadge is at src/components
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, Loader2, AlertTriangle, AlertCircle, Percent, ExternalLink } from 'lucide-react';
import { formatDate, mapStatusToUi } from '../../lib/utils'; // Assuming lib is at src/lib
import { toast } from 'sonner';

// --- Types ---
// ✨ FIX: Use standard relative paths from pages/faculty/
import { ClassworkRequest, Profile, Lecture, ApprovalStepApi, request_status } from '../../types'; // Assuming types is at src/types

// Interface extending the base type for this component
interface RequestDetails extends ClassworkRequest {
    student: Profile;
    lectures: Lecture[];
    approvalHistory: ApprovalStepApi[];
}

// Helper type for status badge
type BadgeStatus = "approved" | "pending" | "under_review" | "rejected" | "pending_hod_exception";


const ReviewRequest: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: facultyUser } = useAuth();

    const [remarks, setRemarks] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [screenshotDisplayUrl, setScreenshotDisplayUrl] = useState<string | null>(null);

    // Fetch request data
    const { data: request, isLoading, isError, error, isSuccess } = useQuery<RequestDetails>({
        queryKey: ['request-details', id],
        queryFn: async () => {
            const { data } = await api.get(`/requests/${id}`);
            data.lectures = data.lectures || [];
            data.approvalHistory = data.approvalHistory || [];
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // useEffect hook to handle logic previously in onSuccess/onError
    useEffect(() => {
        if (isSuccess && request?.attendance_screenshot_url) {
            const url = `${supabase}/storage/v1/object/public/attendance-screenshots/${request.attendance_screenshot_url}`;
            setScreenshotDisplayUrl(url);
            console.log("Constructed screenshot URL:", url);
        } else if (isSuccess && !request?.attendance_screenshot_url) {
             setScreenshotDisplayUrl(null); // Clear if success but no URL
        }
        if (isError) {
            setScreenshotDisplayUrl(null); // Clear URL on fetch error
        }
    }, [request, isSuccess, isError]); // Dependencies


    // Mutation for decision
    const decisionMutation = useMutation({
        mutationFn: ({ decision, remarks }: { decision: 'APPROVED' | 'REJECTED', remarks?: string }) =>
            api.post(`/requests/${id}/decision`, { decision, remarks }),
        onSuccess: (response) => { toast.success(response.data.message || 'Decision processed!'); queryClient.invalidateQueries({ queryKey: ['pending-requests']}); queryClient.invalidateQueries({ queryKey: ['request-details', id]}); navigate('/faculty/dashboard'); },
        onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed.'); },
    });

    const handleApprove = () => { decisionMutation.mutate({ decision: 'APPROVED', remarks }); };
    const handleReject = () => { if (!remarks.trim()) { toast.error("Reason required."); return; } decisionMutation.mutate({ decision: 'REJECTED', remarks: remarks }); setShowRejectModal(false); };

    // --- LOADING STATE ---
    if (isLoading) { return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>; }

    // --- ERROR STATES ---
    if (isError || !request ) { return <div className="flex flex-col items-center justify-center h-screen text-red-600"><AlertTriangle className="w-12 h-12" /><p className="mt-4 font-semibold">Failed to load request details</p><p className="text-sm text-gray-500">{(error as Error)?.message || "The request could not be found."}</p><Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button></div>; }
    if (!request.student) { return <div className="flex flex-col items-center justify-center h-screen text-orange-600"><AlertTriangle className="w-12 h-12" /><p className="mt-4 font-semibold">Data Integrity Issue</p><p className="text-sm text-gray-500">The student associated with this request could not be found.</p><Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button></div>; }

    // --- COMPONENT LOGIC ---
    const uiStatus = mapStatusToUi(request.status) as BadgeStatus;
    const isException = request.status === 'PENDING_HOD_EXCEPTION';
    const isMyTurn = request.current_approver_id === facultyUser?.id;
    const isActionable = (request.status === 'PENDING' || request.status === 'UNDER_REVIEW' || isException) && isMyTurn;
    const attendance = request.attendance_snapshot?.overallAverage;
    const attendanceColor = attendance ? (attendance >= 75 ? 'text-green-600' : 'text-red-600') : 'text-gray-500';

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Review Request</h1>
                            <p className="text-sm text-gray-500">{request.activity_name}</p>
                        </div>
                    </div>
                    <StatusBadge status={uiStatus} size="md" />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-6">

                    {/* HOD Exception Warning */}
                    {isException && (
                        <Card className="bg-yellow-50 border-yellow-500">
                           <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-yellow-700">
                                    <AlertCircle className="w-5 h-5" />
                                    Low Attendance Exception Review
                                </CardTitle>
                                <CardDescription className="text-yellow-700">
                                     This student's verified attendance is <strong className={attendanceColor}>{attendance ?? 'N/A'}%</strong>, below the 75% requirement. Your approval will override this standard.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Label>Student's Justification</Label>
                                <p className="text-sm text-gray-700 italic border-l-4 border-yellow-200 pl-4 py-2 bg-white rounded">
                                    {request.justification_text || "No justification provided."}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Attendance Card */}
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="w-5 h-5 text-blue-600" />
                                Attendance Verification
                            </CardTitle>
                             <CardDescription>Overall average from ERP data and uploaded screenshot.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {/* Display Overall Average */}
                             <div>
                                <Label className="text-sm">Overall Average (ERP Mock)</Label>
                                <div className={`flex items-baseline gap-2 ${attendanceColor}`}>
                                    <span className="text-3xl font-bold">
                                         {attendance !== null && attendance !== undefined ? `${attendance}%` : 'N/A'}
                                    </span>
                                     {attendance !== null && attendance !== undefined && (
                                         <span className={`text-sm font-medium ${attendance >= 75 ? 'text-green-700' : 'text-red-700'}`}>
                                             ({attendance >= 75 ? 'Eligible' : 'Below 75%'})
                                         </span>
                                     )}
                                </div>
                             </div>

                             {/* Display Screenshot */}
                             <div>
                                <Label className="text-sm">Uploaded Attendance Screenshot</Label>
                                {screenshotDisplayUrl ? (
                                    <div className="mt-2 border rounded-lg overflow-hidden">
                                        <a href={screenshotDisplayUrl} target="_blank" rel="noopener noreferrer" title="View full size" className="block relative group">
                                             <img
                                                 src={screenshotDisplayUrl}
                                                 alt="Attendance Screenshot"
                                                 className="max-h-80 w-auto object-contain mx-auto"
                                                 onError={(e) => {
                                                     console.error("Failed to load screenshot image:", screenshotDisplayUrl);
                                                     (e.target as HTMLImageElement).src = `https://placehold.co/400x200/eee/ccc?text=Preview+Unavailable`;
                                                     (e.target as HTMLImageElement).alt = "Screenshot preview unavailable";
                                                 }}
                                             />
                                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <ExternalLink className="w-6 h-6 text-white"/>
                                             </div>
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        { request.attendance_screenshot_url ? 'Loading screenshot...' : 'No attendance screenshot was uploaded.'}
                                     </p>
                                )}
                             </div>
                        </CardContent>
                    </Card>

                    {/* Student Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm">Name</Label>
                                <p className="font-semibold">{request.student.full_name}</p>
                            </div>
                            <div>
                                <Label className="text-sm">College ID</Label>
                                <p className="font-semibold">{request.student.college_id}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sanction Details */}
                    <Card>
                         <CardHeader>
                            <CardTitle>Requested Sanction Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {request.duration_type === 'SINGLE_DAY' ? (
                                <div className="space-y-3">
                                    <p><span className="font-semibold">Date:</span> {formatDate(request.start_date)}</p>
                                    <Label className="font-semibold">Lectures to be sanctioned:</Label>
                                    {request.lectures.length > 0 ? (
                                        <div className="space-y-2">
                                            {request.lectures.map((lec, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                    <span>{lec.lecture_time} - {lec.subject_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">No specific lectures listed.</p>
                                    )}
                                </div>
                            ) : (
                                <p><span className="font-semibold">Duration:</span> {formatDate(request.start_date)} to {request.end_date ? formatDate(request.end_date) : 'N/A'}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Card */}
                    {isActionable ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Action</CardTitle>
                                <CardDescription>Add optional remarks and approve or reject the request.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea placeholder="Add your remarks here (mandatory for rejection)..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} />
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button onClick={handleApprove} disabled={decisionMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                                        {decisionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                        Approve
                                    </Button>
                                    <Button onClick={() => setShowRejectModal(true)} disabled={decisionMutation.isPending} variant="destructive" className="flex-1">
                                        <XCircle className="w-5 h-5 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                         <Card className="bg-gray-50 border-gray-200">
                             <CardContent className="pt-6">
                                 <p className="text-center text-sm text-muted-foreground">
                                     {isMyTurn ? `This request is already ${uiStatus}. No further action needed.` : "This request is currently assigned to another approver."}
                                 </p>
                             </CardContent>
                         </Card>
                    )}
                </div>

                {/* Approval History */}
                <div className="space-y-6 lg:sticky lg:top-24">
                    <Card>
                         <CardHeader>
                            <CardTitle>Approval History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {request.approvalHistory.length > 0 ? request.approvalHistory.map((step, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {step.status === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{step.approver?.full_name || 'Unknown User'} <span className="text-xs font-normal text-gray-500">({step.approver?.role?.replace('_', ' ') || 'UNKNOWN'})</span></p>
                                        <p className={`text-sm font-medium ${step.status === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>{step.status}</p>
                                        {step.remarks && <p className="text-xs text-gray-500 italic mt-1">"{step.remarks}"</p>}
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(step.created_at)}</p>
                                    </div>
                                </div>
                            )) : <p className="text-sm text-gray-500 text-center py-4">No approval actions have been taken yet.</p>}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Reject Modal */}
            {showRejectModal && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="max-w-md w-full">
                         <CardHeader>
                            <CardTitle>Confirm Rejection</CardTitle>
                            <CardDescription>Please provide a mandatory reason for rejecting this request.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Label htmlFor="rejectRemarks">Rejection Remarks</Label>
                            <Textarea id="rejectRemarks" placeholder="Enter your reason here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} className="mt-1"/>
                        </CardContent>
                        <div className="p-6 pt-0 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleReject} disabled={!remarks.trim() || decisionMutation.isPending}>
                                {decisionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Rejection
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ReviewRequest;

