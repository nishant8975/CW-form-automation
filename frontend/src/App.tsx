import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// UI Providers & Components
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Page Components
import Login from "./components/auth/Login";
import StudentDashboard from "./pages/student/Dashboard";
import NewRequest from "./pages/student/NewRequest";
import RequestDetails from "./pages/student/RequestDetails";
import FacultyDashboard from "./pages/faculty/Dashboard";
import ReviewRequest from "./pages/faculty/ReviewRequest";
import NotFound from "./pages/NotFound";

// Initialize the react-query client
const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        {/* === Public Route === */}
                        <Route path="/" element={<Login />} />
                        <Route path="/login" element={<Login />} />

                        {/* === Protected Student Routes === */}
                        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                            <Route path="/student/dashboard" element={<StudentDashboard />} />
                            <Route path="/student/new-request" element={<NewRequest />} />
                            <Route path="/student/request/:id" element={<RequestDetails />} />
                        </Route>

                        {/* === Protected Faculty Routes === */}
                        {/* UPDATED: Add all faculty-level roles to the allowed list */}
                        <Route element={<ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'CONCERNED_AUTHORITY', 'CLASS_COORDINATOR', 'ACADEMIC_COORDINATOR']} />}>
                            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
                            <Route path="/faculty/review/:id" element={<ReviewRequest />} />
                        </Route>

                        {/* === Catch-all Route for 404 Not Found === */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
            
            <Toaster />
            <Sonner richColors />
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;

