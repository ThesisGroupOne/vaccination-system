import AnimalTable from '@/components/AnimalTable';

export default function AnimalsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Animals</h1>
      <AnimalTable />
    </div>
  );
}