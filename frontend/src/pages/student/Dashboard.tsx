import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus,
  Calendar,
  User,
  LogOut,
  FileText,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// --- Types & Helpers ---

// NEW: This interface now perfectly matches the data sent by our backend API
// including the nested profile object for the current approver.
interface ApiRequest {
  id: number;
  activity_name: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING_HOD_EXCEPTION';
  created_at: string;
  duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
  start_date: string;
  end_date: string | null;
  current_approver: {
    full_name: string;
  } | null;
}

// This is the shape of the data our UI components will use.
type UiRequest = {
  id: string;
  activityName: string;
  status: string; // Lowercase for the StatusBadge component
  submittedDate: string;
  duration: string;
  authority: string;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Maps the API's uppercase status to the lowercase version your UI expects.
const mapStatusToUi = (status?: string): string => {
  if (!status) return "pending";
  return status.toLowerCase();
};

// --- Component ---

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Fetches the list of requests for the logged-in student from our backend.
  const {
    data: apiRequests,
    isLoading,
    isError,
    error,
  } = useQuery<ApiRequest[], Error>({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const { data } = await api.get("/requests/my-requests");
      return data;
    },
    // Only fetch if the user is logged in
    enabled: !!user,
  });

  // NEW: This function now correctly calculates duration and finds the authority name.
  const toUiRequest = (r: ApiRequest): UiRequest => {
    let duration = "N/A";
    if (r.duration_type === 'SINGLE_DAY') {
      duration = formatDate(r.start_date);
    } else if (r.end_date) {
      duration = `${formatDate(r.start_date)} to ${formatDate(r.end_date)}`;
    }

    return {
      id: String(r.id),
      activityName: r.activity_name || "Untitled Activity",
      status: mapStatusToUi(r.status),
      submittedDate: formatDate(r.created_at),
      duration: duration,
      // The authority is the current approver. We handle the case where it might be null (e.g., for an approved request).
      authority: r.current_approver?.full_name || "N/A",
    };
  };

  const requests: UiRequest[] = (apiRequests || []).map(toUiRequest);

  // Counts for the stats cards
  const totalRequests = requests.length;
  const pendingCount = requests.filter((r) => ["pending", "under_review", "pending_hod_exception"].includes(r.status)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Student Dashboard</h1>
            {/* NEW: No more mock data. We show a loading state until the real user data is available. */}
            <p className="text-sm text-gray-500">
              Welcome back, {user ? user.full_name : "..."}!
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : totalRequests}</div>
              <p className="text-xs text-muted-foreground">Lifetime submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : pendingCount}</div>
              <p className="text-xs text-muted-foreground">Currently awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate("/student/new-request")}
            size="lg"
            className="gap-2"
          >
            <Plus className="w-5 h-5" />
            New CW Sanction Request
          </Button>
        </div>

        {/* Requests Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>Track the status of your classwork sanction requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                <p className="mt-2 text-gray-500">Loading your requests...</p>
              </div>
            )}

            {isError && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                <p className="font-bold">Failed to load requests</p>
                <p>{(error as Error).message}</p>
              </div>
            )}

            {!isLoading && !isError && (
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-center py-12 text-gray-500">You haven't submitted any requests yet.</p>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/student/request/${request.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-800">{request.activityName}</h3>
                        <StatusBadge
                          status={request.status as "approved" | "pending" | "under_review" | "rejected"}
                          size="md"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{request.submittedDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Approver: {request.authority}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentDashboard;

