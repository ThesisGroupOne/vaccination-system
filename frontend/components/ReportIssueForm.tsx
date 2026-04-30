"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2Icon, AlertCircleIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Animal {
    animal_id: number;
    nickname?: string;
    animal_type: string;
    status: string;
    farm_id: number;
}

export default function ReportIssueForm() {
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [isLoadingAnimals, setIsLoadingAnimals] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        animal_id: '',
        symptoms: ''
    });

    useEffect(() => {
        const fetchAnimals = async () => {
            setIsLoadingAnimals(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:9999/api/animals', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAnimals(data.filter((a: Animal) => a.status === 'Active'));
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoadingAnimals(false);
            }
        };
        fetchAnimals();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.animal_id || !formData.symptoms) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            // In a real app, you'd get the current user_id from the token
            // For now, I'll assume the backend can extract it or provides a way
            const res = await fetch('http://localhost:9999/api/alerts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    animal_id: parseInt(formData.animal_id),
                    symptoms: formData.symptoms,
                    farm_id: animals.find(a => a.animal_id === parseInt(formData.animal_id))?.farm_id,
                    user_id: 1 // Default user_id for now, backend should override this from JWT
                })
            });

            if (res.ok) {
                toast.success("Observation reported successfully");
                setFormData({ animal_id: '', symptoms: '' });
            } else {
                toast.error("Failed to submit report");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="rounded-2xl border-[#2FA4D7]/20 shadow-lg bg-background overflow-hidden border-2">
            <CardHeader className="bg-[#2FA4D7]/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#2FA4D7] text-white flex items-center justify-center shadow-lg shadow-[#2FA4D7]/30">
                        <AlertCircleIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-[#2FA4D7]">Report Observation</CardTitle>
                        <CardDescription className="text-xs">Notify the veterinarian about animal symptoms.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="animal" className="text-sm font-semibold">Select Animal</Label>
                    <Select
                        value={formData.animal_id}
                        onValueChange={v => setFormData({ ...formData, animal_id: v })}
                        disabled={isLoadingAnimals}
                    >
                        <SelectTrigger className="rounded-xl border-muted-foreground/20 h-11 focus:ring-[#2FA4D7]">
                            <SelectValue placeholder={isLoadingAnimals ? "Loading animals..." : "Choose an animal"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-2xl z-[9999] bg-white translate-y-1 max-h-[300px]">
                            {animals.map(animal => (
                                <SelectItem 
                                    key={animal.animal_id} 
                                    value={animal.animal_id.toString()}
                                    className="rounded-lg m-1 cursor-pointer hover:bg-[#2FA4D7]/10 focus:bg-[#2FA4D7]/10 focus:text-[#2FA4D7] py-2.5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">#{animal.animal_id}</Badge>
                                        <span className="font-medium text-slate-700">{animal.nickname || 'Unnamed'}</span>
                                        <span className="text-xs text-slate-400">({animal.animal_type})</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="symptoms" className="text-sm font-semibold">Observations / Symptoms</Label>
                    <Textarea
                        id="symptoms"
                        placeholder="Describe what you see (e.g., coughing, not eating, limping...)"
                        className="min-h-[120px] rounded-xl border-muted-foreground/20 focus:ring-[#2FA4D7]"
                        value={formData.symptoms}
                        onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t border-muted/20 py-4">
                <Button
                    className="w-full rounded-xl bg-[#2FA4D7] hover:bg-[#2FA4D7]/90 text-white font-bold h-11 shadow-lg shadow-[#2FA4D7]/20"
                    disabled={isSubmitting || isLoadingAnimals}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : <SendIcon className="h-5 w-5 mr-2" />}
                    Submit Alert
                </Button>
            </CardFooter>
        </Card>
    );
}
