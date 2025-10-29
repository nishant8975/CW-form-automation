import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { LogOut, User, Loader2, AlertTriangle, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { formatDate, mapStatusToUi } from '@/lib/utils';

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

const RequestsTable: React.FC<{ requests: PendingRequest[] }> = ({ requests }) => {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-gray-100 text-gray-600 uppercase text-xs tracking-widest">
            <th className="p-4 font-semibold">Student</th>
            <th className="p-4 font-semibold">Activity</th>
            <th className="p-4 font-semibold">Submitted</th>
            <th className="p-4 font-semibold text-center">Status</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {requests.length > 0 ? (
            requests.map((request) => {
              const uiStatus = mapStatusToUi(request.status);
              const badgeStatus = uiStatus as any;

              return (
                <tr
                  key={request.id}
                  className="border-b hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => navigate(`/faculty/review/${request.id}`)}
                >
                  <td className="p-4">
                    <p className="font-medium text-gray-800">{request.student?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{request.student?.college_id || 'N/A'}</p>
                  </td>
                  <td className="p-4 text-gray-700">{request.activity_name}</td>
                  <td className="p-4 text-gray-600">{formatDate(request.created_at)}</td>
                  <td className="p-4 text-center"><StatusBadge status={badgeStatus} size="md" /></td>
                  <td className="p-4 text-right"><ArrowRight className="w-5 h-5 text-gray-400" /></td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="py-12 text-center text-gray-500">
                <p className="font-semibold">Nothing to review</p>
                <p className="text-sm">No pending requests found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const FacultyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isHod = user?.role === 'HOD';

  const { data: requests, isLoading, isError, error } = useQuery<PendingRequest[]>({
    queryKey: ['pending-requests'],
    queryFn: async () => {
      const { data } = await api.get('/requests/pending');
      return data;
    },
    enabled: !!user,
  });

  const { exceptionRequests, standardRequests } = React.useMemo(() => {
    const exceptions: PendingRequest[] = [];
    const standards: PendingRequest[] = [];
    requests?.forEach(req => req.status === 'PENDING_HOD_EXCEPTION' ? exceptions.push(req) : standards.push(req));
    return { exceptionRequests: exceptions, standardRequests: standards };
  }, [requests]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{user?.full_name || 'Loading...'}</h1>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {isLoading && (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto animate-spin" />
            <p className="mt-2">Loading requests...</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p className="font-semibold mt-2">Could not load data</p>
            <p className="text-sm">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {isHod && (
              <Card className="border-red-500 border bg-red-50/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" /> Exception Requests ({exceptionRequests.length})
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    Requests requiring your special approval.
                  </CardDescription>
                </CardHeader>
                <CardContent><RequestsTable requests={exceptionRequests} /></CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-5 h-5" /> Pending Requests ({standardRequests.length})
                </CardTitle>
                <CardDescription>Requests assigned to you for review.</CardDescription>
              </CardHeader>
              <CardContent><RequestsTable requests={standardRequests} /></CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default FacultyDashboard;