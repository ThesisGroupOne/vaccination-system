import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// RequestVaccineDialog component
// This dialog allows a user (e.g., a veterinarian) to request a new vaccine shipment
// when stock runs out. It collects doctor name, vaccine type, quantity, and an
// optional note. On submit it POSTs to /api/request-vaccine.

export function RequestVaccineDialog({
  // Optional props to pre‑populate fields
  defaultDoctorName = "",
  defaultVaccineType = "",
}: {
  defaultDoctorName?: string;
  defaultVaccineType?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      doctorName: formData.get("doctorName") as string,
      vaccineType: formData.get("vaccineType") as string,
      quantity: Number(formData.get("quantity")),
      notes: formData.get("notes") as string,
    };

    try {
      const res = await fetch("http://localhost:9999/api/request-vaccine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      // Show success toast
      toast.success("Vaccine request submitted");
      // Close dialog on success
      setOpen(false);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Request Vaccine</Button>
      </DialogTrigger>
      <DialogContent className="bg-white/90 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>Request Vaccine from Doctor</DialogTitle>
          <DialogDescription>
            Fill in the details below to place a new vaccine request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-1">
            <label htmlFor="doctorName" className="text-sm font-medium">
              Doctor Name
            </label>
            <Input
              id="doctorName"
              name="doctorName"
              defaultValue={defaultDoctorName}
              required
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="vaccineType" className="text-sm font-medium">
              Vaccine Type
            </label>
            <Input
              id="vaccineType"
              name="vaccineType"
              defaultValue={defaultVaccineType}
              required
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity Needed
            </label>
            <Input id="quantity" name="quantity" type="number" min={1} required />
          </div>
          <div className="grid gap-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes / Reason (optional)
            </label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="ghost" type="button" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
