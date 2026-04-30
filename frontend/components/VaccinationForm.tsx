import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VaccinationForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Vaccination</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <label>Animal ID</label>
            <input type="text" className="w-full p-2 border" />
          </div>
          <div>
            <label>Vaccine ID</label>
            <input type="text" className="w-full p-2 border" />
          </div>
          <div>
            <label>Date</label>
            <input type="date" className="w-full p-2 border" />
          </div>
          <Button type="submit">Submit</Button>
        </form>
      </CardContent>
    </Card>
  );
}