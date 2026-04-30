"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function DashboardCharts() {
  // Mock data for charts
  const vaccinationData = [
    { month: 'Jan', vaccinations: 20 },
    { month: 'Feb', vaccinations: 35 },
    { month: 'Mar', vaccinations: 45 },
    { month: 'Apr', vaccinations: 30 },
    { month: 'May', vaccinations: 50 },
    { month: 'Jun', vaccinations: 40 },
  ];

  const animalData = [
    { farm: 'Farm A', animals: 50 },
    { farm: 'Farm B', animals: 30 },
    { farm: 'Farm C', animals: 70 },
    { farm: 'Farm D', animals: 40 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Vaccinations per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vaccinationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="vaccinations" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Animals per Farm</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={animalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="farm" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="animals" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}