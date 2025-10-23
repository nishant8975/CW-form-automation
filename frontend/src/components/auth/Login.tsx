import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api"; // Ensure this path is correct
import { useAuth } from "../../context/AuthContext"; // 1. IMPORT THE useAuth HOOK

// User shape returned by backend
interface User {
  id: string;
  full_name: string;
  email: string;
  role: "STUDENT" | "FACULTY" | "HOD" | string;
  // add other fields if required
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // 2. GET THE login FUNCTION FROM THE CONTEXT
  const [collegeId, setCollegeId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        college_id: collegeId,
        password: password,
      });

      if (response.data) {
        const { accessToken, user }: { accessToken: string; user: User } =
          response.data;

        // 3. USE THE CONTEXT'S login FUNCTION
        // This will handle localStorage and update the global state.
        login(accessToken, user);

        toast.success("Login successful!");

        // Redirect based on role (this logic remains the same)
        if (user.role === "STUDENT") {
          navigate("/student/dashboard");
        } else {
          navigate("/faculty/dashboard");
        }
      } else {
        toast.error("Unexpected response from server.");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">K.K. Wagh</h1>
                <p className="text-gray-500">Institute of Engineering</p>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-gray-800">
                Classwork Automation System
              </h2>
              <p className="text-lg text-gray-600">
                Streamlined ERP-integrated sanctioning process for students and
                faculty
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Automated ERP Verification
                </h3>
                <p className="text-sm text-gray-500">
                  Real-time attendance validation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Smart Lecture Selection
                </h3>
                <p className="text-sm text-gray-500">
                  Time-specific or multi-day requests
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Transparent Tracking</h3>
                <p className="text-sm text-gray-500">
                  Real-time approval status updates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Single unified Login form */}
        <Card className="shadow-lg border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collegeId">College ID</Label>
                <div className="relative">
                  <Input
                    id="collegeId"
                    type="text"
                    placeholder="e.g. 2101XXXX"
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Having trouble logging in?{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Mobile branding */}
        <div className="lg:hidden text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">K.K. Wagh CW System</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckIcon: React.FC = () => (
  <svg
    className="w-5 h-5 text-blue-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default Login;

