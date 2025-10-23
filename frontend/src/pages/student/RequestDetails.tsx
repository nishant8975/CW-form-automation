import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatDate, mapStatusToUi } from '@/lib/utils';

// --- Types ---
interface Profile {
    full_name: string;
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
    approver: Profile;
}

interface RequestDetailsData {
    id: string;
    activity_name: string;
    status: string;
    created_at: string;
    duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
    start_date: string;
    end_date: string | null;
    lectures: Lecture[];
    approvalHistory: ApprovalStep[];
}

const RequestDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Fetch detailed data for this specific request from our backend
    const { data: request, isLoading, isError, error } = useQuery<RequestDetailsData>({
        queryKey: ['request-details', id],
        queryFn: async () => {
            const { data } = await api.get(`/requests/${id}`);
            return data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (isError || !request) {
        return (
             <div className="flex flex-col items-center justify-center h-screen text-red-600">
                <AlertTriangle className="w-12 h-12" />
                <p className="mt-4 font-semibold">Failed to load request details</p>
                <p className="text-sm text-gray-500">{(error as Error)?.message || "The request could not be found."}</p>
                 <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Request Details</h1>
                            <p className="text-sm text-gray-500">{request.activity_name}</p>
                        </div>
                    </div>
                    <StatusBadge status={mapStatusToUi(request.status) as "approved" | "pending" | "under_review" | "rejected"} size="lg"/>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sanction Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {request.duration_type === 'SINGLE_DAY' ? (
                                <div className="space-y-3">
                                    <p><span className="font-semibold">Date:</span> {formatDate(request.start_date)}</p>
                                    <p className="font-semibold">Lectures to be sanctioned:</p>
                                    <div className="space-y-2">
                                    {request.lectures.map(lec => (
                                        <div key={lec.lecture_time} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
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
                            <CardTitle>Approval History</CardTitle>
                            <CardDescription>Track the progress of your request through the approval chain.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {request.approvalHistory.length > 0 ? request.approvalHistory.map(step => (
                               <div key={step.created_at} className="flex gap-4">
                                   <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                       {step.status === 'APPROVED' ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                                   </div>
                                   <div>
                                       <p className="font-semibold">{step.approver.full_name} <span className="text-xs font-normal text-gray-500">({step.approver.role.replace(/_/g, ' ')})</span></p>
                                       <p className={`text-sm font-medium ${step.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>{step.status}</p>
                                       {step.remarks && <p className="text-xs text-gray-500 italic mt-1">"{step.remarks}"</p>}
                                       <p className="text-xs text-gray-400 mt-1">{formatDate(step.created_at)}</p>
                                   </div>
                               </div>
                           )) : <p className="text-sm text-gray-500 text-center py-4">No approval actions have been taken yet.</p>}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default RequestDetails;
