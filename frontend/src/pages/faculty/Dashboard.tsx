import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { LogOut, User, Loader2, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import { formatDate, mapStatusToUi } from '@/lib/utils';

// Type for a single request received from the API
interface PendingRequest {
    id: number;
    activity_name: string;
    created_at: string;
    status: string;
    student: {
        full_name: string;
        college_id: string;
    } | null;
}

const FacultyDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const {
        data: requests,
        isLoading,
        isError,
        error,
    } = useQuery<PendingRequest[]>({
        queryKey: ['pending-requests'],
        queryFn: async () => {
            const { data } = await api.get('/requests/pending');
            return data;
        },
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">{user?.full_name}</h1>
                            <p className="text-sm text-gray-500">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Pending CW Requests
                        </CardTitle>
                        <CardDescription>Requests assigned to you for approval.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                                <p className="mt-2">Loading pending requests...</p>
                            </div>
                        )}
                        {isError && (
                            <div className="text-center py-12 text-red-600">
                                <AlertTriangle className="w-8 h-8 mx-auto" />
                                <p className="mt-2 font-semibold">Failed to load requests</p>
                                <p className="text-sm text-gray-500">{(error as Error).message}</p>
                            </div>
                        )}
                        {!isLoading && !isError && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b bg-gray-50 text-sm text-gray-600 uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Student</th>
                                            <th className="p-4 font-semibold">Activity</th>
                                            <th className="p-4 font-semibold">Submitted On</th>
                                            <th className="p-4 font-semibold text-center">Status</th>
                                            <th className="p-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests && requests.length > 0 ? (
                                            requests.map((request) => {
                                                // Handle the special status case before rendering
                                                const uiStatus = mapStatusToUi(request.status);
                                                const badgeStatus = uiStatus === 'pending_hod_exception' ? 'pending' : uiStatus;

                                                return (
                                                    <tr
                                                        key={request.id}
                                                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                                        onClick={() => navigate(`/faculty/review/${request.id}`)}
                                                    >
                                                        <td className="p-4 align-top">
                                                            <p className="font-semibold text-gray-800">{request.student?.full_name || 'Unknown Student'}</p>
                                                            <p className="text-sm text-gray-500">{request.student?.college_id || 'N/A'}</p>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <p className="text-gray-700">{request.activity_name}</p>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <p className="text-gray-600">{formatDate(request.created_at)}</p>
                                                        </td>
                                                        <td className="p-4 align-top text-center">
                                                            {/* ✨ FIX: Use the corrected status variable that the badge can understand */}
                                                            <StatusBadge
                                                                status={badgeStatus as "approved" | "pending" | "under_review" | "rejected"}
                                                                size="md"
                                                            />
                                                        </td>
                                                        <td className="p-4 align-top text-right">
                                                            <ArrowRight className="w-5 h-5 text-gray-400 inline-block" />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-16 text-gray-500">
                                                    <p className="font-semibold">All Clear!</p>
                                                    <p>You have no pending requests to review.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default FacultyDashboard;

