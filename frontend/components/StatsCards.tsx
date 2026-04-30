import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatsCards() {
  // Mock data, in real app fetch from API
  const stats = [
    { title: 'Total Farms', value: '25' },
    { title: 'Total Animals', value: '150' },
    { title: 'Vaccinations Today', value: '12' },
    { title: 'Vaccine Stock Remaining', value: '500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader>
            <CardTitle>{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}