import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
// ✨ Corrected relative path from src/pages/student/ to src/services/
import api from '@/services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, BookCheck, AlertTriangle, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

// --- Types ---
interface Lecture {
    subject_name: string;
    lecture_time: string;
}

interface NewRequestPayload {
    activity_name: string;
    duration_type: 'SINGLE_DAY' | 'MULTI_DAY';
    start_date?: string;
    end_date?: string;
    lectures?: string; // Send as JSON string in FormData
    concerned_authority_id: string;
    justification_text?: string;
    attendanceScreenshot?: File;
}

interface Authority {
    id: string;
    full_name: string;
}

// Mock Timetable (replace with real fetch)
const mockTimetable: Lecture[] = [
    { lecture_time: "09:00 AM - 10:00 AM", subject_name: "Operating Systems" },
    { lecture_time: "10:00 AM - 11:00 AM", subject_name: "Data Structures" },
    { lecture_time: "11:00 AM - 12:00 PM", subject_name: "DSA Lab" },
    { lecture_time: "01:00 PM - 02:00 PM", subject_name: "Computer Networks" },
];

const NewRequest: React.FC = () => {
    const navigate = useNavigate();

    // Form state
    const [activityName, setActivityName] = React.useState('');
    const [isMultiDay, setIsMultiDay] = React.useState(false);
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [concernedAuthorityId, setConcernedAuthorityId] = React.useState<string | undefined>(undefined);
    const [selectedLectures, setSelectedLectures] = React.useState<Lecture[]>([]);
    const [attendanceScreenshot, setAttendanceScreenshot] = React.useState<File | null>(null);

    // Exception modal state
    const [showExceptionModal, setShowExceptionModal] = React.useState(false);
    const [justification, setJustification] = React.useState('');
    const [lowAttendance, setLowAttendance] = React.useState<number | null>(null);

    // Fetch authorities
    const { data: authorities, isLoading: isLoadingAuthorities } = useQuery<Authority[]>({
        queryKey: ['authorities'],
        queryFn: async () => {
            const { data } = await api.get('/profiles/authorities');
            return data;
        },
    });

    // Fetch timetable
    const timetableQuery = useQuery<Lecture[]>({
        queryKey: ['timetable', startDate],
        queryFn: async (): Promise<Lecture[]> => {
             await new Promise(resolve => setTimeout(resolve, 500));
             return mockTimetable;
        },
        enabled: !!startDate && !isMultiDay,
        onSuccess: () => {
            setSelectedLectures([]);
        }
    });

    // Mutation for form submission
    const mutation = useMutation({
        mutationFn: (formData: FormData) => api.post('/requests', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
        onSuccess: () => {
            toast.success('Request submitted successfully!');
            navigate('/student/dashboard');
        },
        onError: (error: any) => {
            if (error.response?.status === 402) {
                setLowAttendance(error.response.data.attendance);
                setShowExceptionModal(true);
                toast.warning('Attendance is below the required threshold.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to submit request.');
            }
        },
    });

    const handleLectureToggle = (lecture: Lecture, checked: boolean) => {
        if (checked) {
             setSelectedLectures(prev => [...prev, lecture]);
         } else {
             setSelectedLectures(prev => prev.filter(l => l.lecture_time !== lecture.lecture_time));
         }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
             if (file.size > 5 * 1024 * 1024) { // 5MB limit
                 toast.error("File size exceeds 5MB limit.");
                 setAttendanceScreenshot(null);
                 event.target.value = ''; // Clear input
                 return;
             }
             setAttendanceScreenshot(file);
        } else {
             setAttendanceScreenshot(null);
        }
    };

    const createFormData = (includeJustification = false): FormData | null => {
        if (isFormInvalid) {
            toast.error("Please fill all required fields, including the screenshot.");
            return null;
        }
        if (includeJustification && !justification.trim()) {
            toast.error("Please provide a justification for the exception.");
            return null;
        }


        const formData = new FormData();
        formData.append('activity_name', activityName);
        formData.append('duration_type', isMultiDay ? 'MULTI_DAY' : 'SINGLE_DAY');
        formData.append('concerned_authority_id', concernedAuthorityId!);
        formData.append('start_date', startDate);
        if (isMultiDay) {
            formData.append('end_date', endDate);
        } else {
            formData.append('lectures', JSON.stringify(selectedLectures));
        }
        if (includeJustification) {
            formData.append('justification_text', justification);
        }
        if (attendanceScreenshot) { // Validation ensures it exists here
            formData.append('attendanceScreenshot', attendanceScreenshot);
        }

        return formData;
    };


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = createFormData();
        if (formData) {
            mutation.mutate(formData);
        }
    };

    const handleExceptionSubmit = () => {
        const formData = createFormData(true); // Include justification
        if (formData) {
            mutation.mutate(formData);
            setShowExceptionModal(false);
        }
    }

    // Form validation logic
    const isFormInvalid = React.useMemo(() => {
        if (!activityName || !concernedAuthorityId || !startDate || !attendanceScreenshot) {
            return true;
        }
        if (isMultiDay && !endDate) {
            return true;
        }
        // Ensure timetable data is loaded before checking selected lectures
        if (!isMultiDay && (!Array.isArray(timetableQuery.data) || selectedLectures.length === 0)) {
            return true;
        }
        return false;
    }, [activityName, concernedAuthorityId, startDate, isMultiDay, endDate, selectedLectures, attendanceScreenshot, timetableQuery.data]);


    return (
        <div className="min-h-screen bg-gray-50 pb-12">
             <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                 <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                     <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                         <ArrowLeft className="w-5 h-5" />
                     </Button>
                     <div>
                         <h1 className="text-xl font-bold text-gray-800">New CW Sanction Request</h1>
                         <p className="text-sm text-gray-500">Submit the information about your activity or event</p>
                     </div>
                 </div>
             </header>

             <main className="container mx-auto px-4 py-8">
                 <Card className="max-w-3xl mx-auto">
                     <CardHeader>
                         <CardTitle>Request Details</CardTitle>
                         <CardDescription>All fields are required unless marked optional.</CardDescription>
                     </CardHeader>
                     <CardContent>
                         <form onSubmit={handleSubmit} className="space-y-6">
                             {/* --- Activity Name --- */}
                             <div className="space-y-2">
                                 <Label htmlFor="activityName">Activity Name</Label>
                                 <Input id="activityName" value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="e.g., National Level Hackathon" required/>
                             </div>

                            {/* --- File Input --- */}
                             <div className="space-y-2">
                                <Label htmlFor="attendanceScreenshot">Attendance Screenshot</Label>
                                <Input
                                    id="attendanceScreenshot"
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={handleFileChange}
                                    required
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {attendanceScreenshot && (
                                    <p className="text-xs text-muted-foreground">Selected: {attendanceScreenshot.name} ({(attendanceScreenshot.size / 1024).toFixed(1)} KB)</p>
                                )}
                                <CardDescription>Upload a clear screenshot from the ERP showing your attendance. Max 5MB.</CardDescription>
                             </div>

                             {/* --- Concerned Authority --- */}
                             <div className="space-y-2">
                                 <Label htmlFor="concernedAuthority">Concerned Authority</Label>
                                 <Select onValueChange={setConcernedAuthorityId} required value={concernedAuthorityId}>
                                     <SelectTrigger id="concernedAuthority" disabled={isLoadingAuthorities}>
                                         <SelectValue placeholder={isLoadingAuthorities ? "Loading authorities..." : "Select the initial approver..."} />
                                     </SelectTrigger>
                                     <SelectContent>
                                         {authorities?.map(auth => (
                                             <SelectItem key={auth.id} value={auth.id}>
                                                 {auth.full_name}
                                             </SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                             </div>

                             {/* --- Multi-Day Switch --- */}
                             <div className="flex items-center justify-between rounded-lg border p-4">
                                 <div className="space-y-0.5">
                                     <Label htmlFor="multiDaySwitch" className="text-base">Multi-Day Event?</Label>
                                     <CardDescription>
                                         Is your activity spanning across multiple days?
                                     </CardDescription>
                                 </div>
                                 <Switch id="multiDaySwitch" checked={isMultiDay} onCheckedChange={setIsMultiDay} />
                             </div>

                             {/* --- Date Inputs --- */}
                             {isMultiDay ? (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                         <Label htmlFor="startDate">Start Date</Label>
                                         <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
                                     </div>
                                     <div className="space-y-2">
                                         <Label htmlFor="endDate">End Date</Label>
                                         <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || undefined}/>
                                     </div>
                                 </div>
                             ) : (
                                  <div className="space-y-2">
                                      <Label htmlFor="singleDate">Date of Activity</Label>
                                      <Input id="singleDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>

                                      {/* --- Lecture Selection --- */}
                                      {startDate && (
                                          <div className="space-y-3 pt-4">
                                              <Label className="flex items-center gap-2">
                                                  <BookCheck className="w-5 h-5 text-gray-600" />
                                                  Select Lectures to be Sanctioned
                                              </Label>
                                              {/* Loading/Error state for timetable */}
                                              {timetableQuery.isLoading && (
                                                  <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-4 h-4 mr-2 inline animate-spin"/>Loading timetable...</div>
                                              )}
                                              {timetableQuery.isError && (
                                                 <div className="text-center py-4 text-destructive"><AlertTriangle className="w-4 h-4 mr-2 inline"/>Failed to load timetable.</div>
                                              )}
                                              {/* Check Array.isArray before accessing .length or .map */}
                                              {Array.isArray(timetableQuery.data) && timetableQuery.data.length > 0 && (
                                                <div className="grid sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50/50">
                                                    {timetableQuery.data.map((lecture) => (
                                                        <div key={lecture.lecture_time} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={lecture.lecture_time}
                                                                onCheckedChange={(checked) => handleLectureToggle(lecture, !!checked)}
                                                                checked={selectedLectures.some(l => l.lecture_time === lecture.lecture_time)}
                                                            />
                                                            <Label htmlFor={lecture.lecture_time} className="font-normal cursor-pointer text-sm">
                                                                {lecture.lecture_time} - {lecture.subject_name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                              )}
                                               {Array.isArray(timetableQuery.data) && timetableQuery.data.length === 0 && (
                                                   <p className="text-sm text-center py-4 text-muted-foreground">No lectures found for the selected date.</p>
                                               )}
                                          </div>
                                      )}
                                  </div>
                             )}

                            {/* --- Submit Buttons --- */}
                             <div className="flex justify-end gap-2 pt-4 border-t">
                                 <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>Cancel</Button>
                                 <Button type="submit" disabled={isFormInvalid || mutation.isPending}>
                                     {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                     Submit Request
                                 </Button>
                             </div>
                         </form>
                     </CardContent>
                 </Card>
             </main>

            {/* --- Exception Modal --- */}
             {showExceptionModal && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                     <Card className="max-w-lg w-full">
                         <CardHeader>
                             <CardTitle>Low Attendance Exception</CardTitle>
                             <CardDescription>Your verified attendance is <strong className="text-red-600">{lowAttendance}%</strong>, which is below the 75% requirement. Please provide a strong justification to request an exception from the HOD.</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <Label htmlFor="justification">Justification</Label>
                             <Textarea id="justification" placeholder="Explain why participating in this activity is critical despite low attendance..." value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} />
                         </CardContent>
                         <div className="p-6 pt-0 flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowExceptionModal(false)} disabled={mutation.isPending}>Cancel</Button>
                              <Button onClick={handleExceptionSubmit} disabled={!justification.trim() || mutation.isPending}>
                                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Submit Exception Request
                              </Button>
                         </div>
                     </Card>
                 </div>
             )}

        </div>
    );
};

export default NewRequest;

