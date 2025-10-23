import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, Clock, User, Loader2, AlertTriangle } from 'lucide-react';
import { formatDate, mapStatusToUi } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types ---
interface Profile {
    id: string; // Added ID for completeness
    full_name: string;
    college_id: string;
    role: string;
}

interface Lecture {
    subject_name: string;
    lecture_time: string;
}

interface ApprovalStep {
    created_at: string;
    status: string;
    remarks: string | null;
    approver: Partial<Profile>; // Approver might be partial if fetched separately
}

interface RequestDetails {
    id: number; // Changed to number based on DB schema
    activity_name: string;
    status: string;
    created_at: string;
    duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
    start_date: string;
    end_date: string | null;
    student: Profile | null; // Allow student to potentially be null
    lectures: Lecture[];
    approvalHistory: ApprovalStep[];
}

const ReviewRequest: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [remarks, setRemarks] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Fetch detailed request data
    const { data: request, isLoading, isError, error } = useQuery<RequestDetails>({
        queryKey: ['request-details', id],
        queryFn: async () => {
            const { data } = await api.get(`/requests/${id}`);
            return data;
        },
    });

    // Mutation for approving or rejecting
    const decisionMutation = useMutation({
        mutationFn: ({ decision, remarks }: { decision: 'APPROVED' | 'REJECTED', remarks?: string }) =>
            api.post(`/requests/${id}/decision`, { decision, remarks }),
        onSuccess: (response) => {
            toast.success(response.data.message || 'Decision processed successfully!');
            queryClient.invalidateQueries({ queryKey: ['pending-requests'] }); // Refetch the dashboard list
            navigate('/faculty/dashboard');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to process decision.');
        },
    });

    const handleApprove = () => {
        decisionMutation.mutate({ decision: 'APPROVED', remarks });
    };

    const handleReject = () => {
        if (!remarks.trim()) {
            toast.error("Please provide a reason for rejection.");
            return;
        }
        decisionMutation.mutate({ decision: 'REJECTED', remarks: remarks });
        setShowRejectModal(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    // Handle case where request might load but student data is missing (due to orphaned request)
    if (isError || !request ) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-600">
                <AlertTriangle className="w-12 h-12" />
                <p className="mt-4 font-semibold">Failed to load request details</p>
                <p className="text-sm text-gray-500">{(error as Error)?.message || "The request or associated student could not be found."}</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }
     // Additional check specifically for missing student profile
     if (!request.student) {
         return (
             <div className="flex flex-col items-center justify-center h-screen text-orange-600">
                 <AlertTriangle className="w-12 h-12" />
                 <p className="mt-4 font-semibold">Data Integrity Issue</p>
                 <p className="text-sm text-gray-500">The student associated with this request could not be found. Please contact support or clean up orphaned data.</p>
                 <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
             </div>
         );
     }


    const uiStatus = mapStatusToUi(request.status);
    const badgeStatus = uiStatus === 'pending_hod_exception' ? 'pending' : uiStatus;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white border-b border-gray-200">
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
                    <StatusBadge
                        status={badgeStatus as "approved" | "pending" | "under_review" | "rejected"}
                        size="md"
                    />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-sm">Name</Label>
                                {/* ✨ FIX: Use optional chaining (?.) and fallback */}
                                <p className="font-semibold">{request.student?.full_name || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-sm">College ID</Label>
                                {/* ✨ FIX: Use optional chaining (?.) and fallback */}
                                <p className="font-semibold">{request.student?.college_id || 'N/A'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Requested Sanction Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {request.duration_type === 'SINGLE_DAY' ? (
                                <div className="space-y-3">
                                    <p><span className="font-semibold">Date:</span> {formatDate(request.start_date)}</p>
                                    <Label>Lectures to be sanctioned:</Label>
                                    <div className="space-y-2">
                                        {request.lectures.map(lec => (
                                            <div key={lec.lecture_time} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                                <Clock className="w-4 h-4 text-gray-500" />
                                                <span>{lec.lecture_time} - {lec.subject_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p><span className="font-semibold">Duration:</span> {formatDate(request.start_date)} to {formatDate(request.end_date)}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Your Action</CardTitle>
                            <CardDescription>Add optional remarks and approve or reject the request.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea placeholder="Add your remarks here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} />
                            <div className="flex gap-4">
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
                </div>

                {/* Approval History - Right Side */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Approval History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {request.approvalHistory.length > 0 ? request.approvalHistory.map(step => (
                                <div key={step.created_at} className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {step.status === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div>
                                        {/* ✨ FIX: Use optional chaining (?.) and fallback */}
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
                            <CardTitle>Reject Request</CardTitle>
                            <CardDescription>Please provide a mandatory reason for rejecting this request.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea placeholder="Enter your reason here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} />
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

