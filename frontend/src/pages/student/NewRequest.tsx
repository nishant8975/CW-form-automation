import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, BookCheck } from 'lucide-react';
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
    lectures?: Lecture[];
    concerned_authority_id: string;
    justification_text?: string;
}

interface Authority {
    id: string;
    full_name: string;
}

const mockTimetable: Lecture[] = [
    { lecture_time: "09:00 AM - 10:00 AM", subject_name: "Operating Systems" },
    { lecture_time: "10:00 AM - 11:00 AM", subject_name: "Data Structures" },
    { lecture_time: "11:00 AM - 12:00 PM", subject_name: "DSA Lab" },
    { lecture_time: "01:00 PM - 02:00 PM", subject_name: "Computer Networks" },
];

const NewRequest: React.FC = () => {
    const navigate = useNavigate();
    
    // Form state
    const [activityName, setActivityName] = useState('');
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [concernedAuthorityId, setConcernedAuthorityId] = useState<string | undefined>(undefined);
    const [selectedLectures, setSelectedLectures] = useState<Lecture[]>([]);
    
    // State for the exception modal
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [justification, setJustification] = useState('');
    const [lowAttendance, setLowAttendance] = useState<number | null>(null);

    // ✨ NEW: Fetch the list of authorities from the backend ✨
    const { data: authorities, isLoading: isLoadingAuthorities } = useQuery<Authority[]>({
        queryKey: ['authorities'],
        queryFn: async () => {
            const { data } = await api.get('/profiles/authorities');
            return data;
        },
    });

    const mutation = useMutation({
        mutationFn: (newRequest: NewRequestPayload) => api.post('/requests', newRequest),
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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload: NewRequestPayload = {
            activity_name: activityName,
            duration_type: isMultiDay ? 'MULTI_DAY' : 'SINGLE_DAY',
            concerned_authority_id: concernedAuthorityId!,
            start_date: startDate,
            end_date: isMultiDay ? endDate : undefined,
            lectures: isMultiDay ? undefined : selectedLectures, 
        };
        mutation.mutate(payload);
    };
    
    const handleExceptionSubmit = () => {
        const payload: NewRequestPayload = {
            activity_name: activityName,
            duration_type: isMultiDay ? 'MULTI_DAY' : 'SINGLE_DAY',
            concerned_authority_id: concernedAuthorityId!,
            justification_text: justification,
            start_date: startDate,
            end_date: isMultiDay ? endDate : undefined,
            lectures: isMultiDay ? undefined : selectedLectures,
        };
        mutation.mutate(payload);
        setShowExceptionModal(false);
    }

    return (
        <div className="min-h-screen bg-gray-50">
             <header className="bg-white border-b border-gray-200">
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
                            <div className="space-y-2">
                                <Label htmlFor="activityName">Activity Name</Label>
                                <Input id="activityName" value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="e.g., National Level Hackathon" required/>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="concernedAuthority">Concerned Authority</Label>
                                <Select onValueChange={setConcernedAuthorityId} required>
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

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="multiDaySwitch">Multi-Day Event?</Label>
                                    <CardDescription>
                                        Is your activity spanning across multiple days?
                                    </CardDescription>
                                </div>
                                <Switch id="multiDaySwitch" checked={isMultiDay} onCheckedChange={setIsMultiDay} />
                            </div>

                            {isMultiDay ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required/>
                                    </div>
                                </div>
                            ) : (
                                 <div className="space-y-2">
                                    <Label htmlFor="singleDate">Date of Activity</Label>
                                    <Input id="singleDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required/>
                                    
                                    {startDate && (
                                        <div className="space-y-3 pt-4">
                                            <Label className="flex items-center gap-2">
                                                <BookCheck className="w-5 h-5 text-gray-600" />
                                                Select Lectures to be Sanctioned
                                            </Label>
                                            <div className="grid sm:grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50/50">
                                                {mockTimetable.map((lecture) => (
                                                    <div key={lecture.lecture_time} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id={lecture.lecture_time}
                                                            onCheckedChange={(checked) => handleLectureToggle(lecture, !!checked)}
                                                        />
                                                        <Label htmlFor={lecture.lecture_time} className="font-normal cursor-pointer">
                                                            {lecture.lecture_time} - {lecture.subject_name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Submit Request
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>

            {showExceptionModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <Card className="max-w-lg w-full">
                        <CardHeader>
                            <CardTitle>Low Attendance Exception</CardTitle>
                            <CardDescription>Your attendance is {lowAttendance}%, which is below the 75% requirement. Please provide a strong justification to proceed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea placeholder="Explain why this request is critical..." value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} />
                        </CardContent>
                        <div className="p-6 pt-0 flex justify-end gap-2">
                             <Button variant="outline" onClick={() => setShowExceptionModal(false)}>Cancel</Button>
                             <Button onClick={handleExceptionSubmit} disabled={!justification.trim() || mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Submit to HOD
                             </Button>
                        </div>
                    </Card>
                </div>
            )}

        </div>
    );
};

export default NewRequest;

