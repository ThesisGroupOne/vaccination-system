"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Select from 'react-select';
import { Loader2Icon, AlertCircleIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Animal {
    animal_id: number;
    nickname?: string;
    animal_type: string;
    biological_type?: string;
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
                })
            });

            if (res.ok) {
                const data = await res.json();
                const mail = data?.email_notification;
                if (mail?.ok) {
                    toast.success(`Observation reported. Gmail sent to ${mail.sent} doctor(s).`);
                } else if (mail && (mail.sent > 0 || mail.failed > 0)) {
                    toast.warning(`Observation reported. Gmail sent: ${mail.sent}, failed: ${mail.failed}.`);
                } else {
                    toast.warning("Observation reported, but no doctor Gmail was notified.");
                }
                setFormData({ animal_id: '', symptoms: '' });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to submit report");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const animalOptions = animals.map(animal => ({
        value: animal.animal_id.toString(),
        label: `${animal.nickname || 'Unnamed'} (${animal.animal_type}) - #${animal.animal_id}`,
        animal: animal
    }));

    const formatOptionLabel = ({ animal }: { animal: Animal }) => {
        let genderLabel = animal.biological_type;
        if (genderLabel) {
            const lower = genderLabel.toLowerCase();
            if (lower.includes('female')) genderLabel = 'Female';
            else if (lower.includes('male')) genderLabel = 'Male';
        }

        return (
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 bg-slate-50 border-slate-200">#{animal.animal_id}</Badge>
                    <span className="font-bold text-slate-800">{animal.nickname || 'Unnamed'}</span>
                    <span className="text-[10px] text-slate-500 font-medium">({animal.animal_type})</span>
                </div>
                {genderLabel && genderLabel !== 'Unknown' && (
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                        {genderLabel}
                    </span>
                )}
            </div>
        );
    };

    return (
        <Card className="rounded-[20px] border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-50 p-6 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <AlertCircleIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col space-y-0.5">
                        <CardTitle className="text-base font-extrabold text-slate-800">Report Observation</CardTitle>
                        <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">Notify the veterinarian about animal symptoms.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="animal" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Select Animal</Label>
                    <Select
                        options={animalOptions}
                        // @ts-expect-error - react-select types for formatOptionLabel are generic
                        formatOptionLabel={formatOptionLabel}
                        value={animalOptions.find(o => o.value === formData.animal_id) || null}
                        onChange={(selected: { value: string, label: string, animal: Animal } | null) => setFormData({ ...formData, animal_id: selected?.value || '' })}
                        isDisabled={isLoadingAnimals}
                        placeholder={isLoadingAnimals ? "Loading animals..." : "Choose an animal"}
                        isSearchable={true}
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(249, 250, 251, 0.5)',
                                borderColor: state.isFocused ? '#f59e0b' : '#e5e7eb',
                                boxShadow: state.isFocused ? '0 0 0 1px #f59e0b' : 'none',
                                minHeight: '44px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                '&:hover': {
                                    borderColor: state.isFocused ? '#f59e0b' : '#d1d5db',
                                }
                            }),
                            menu: (base) => ({
                                ...base,
                                borderRadius: '0.75rem',
                                overflow: 'hidden',
                                zIndex: 50,
                            }),
                            option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected ? '#fffbeb' : state.isFocused ? '#f8fafc' : 'white',
                                color: state.isSelected ? '#92400e' : 'inherit',
                                cursor: 'pointer',
                                ':active': {
                                    backgroundColor: '#fef3c7',
                                }
                            })
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="symptoms" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Observations / Symptoms</Label>
                    <Textarea
                        id="symptoms"
                        placeholder="Describe what you see (e.g., coughing, not eating, limping...)"
                        className="min-h-[120px] rounded-xl bg-gray-50/50 border border-gray-200 text-xs font-medium focus-visible:ring-amber-500"
                        value={formData.symptoms}
                        onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-white border-t border-gray-50 p-6">
                <Button
                    className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold h-11 shadow-md text-sm"
                    disabled={isSubmitting || isLoadingAnimals}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                    Submit Alert
                </Button>
            </CardFooter>
        </Card>
    );
}
