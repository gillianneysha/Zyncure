import React from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Sample data for charts
const userDemographicData = [
  { name: 'Desktop Users', value: 65, color: '#FF6B6B' },
  { name: 'Mobile Users', value: 25, color: '#4ECDC4' },
  { name: 'Tablet Users', value: 10, color: '#45B7D1' }
];

const monthlyActiveUsers = [
  { month: 'Jan', users: 850 },
  { month: 'Feb', users: 920 },
  { month: 'Mar', users: 880 },
  { month: 'Apr', users: 950 },
  { month: 'May', users: 1020 },
  { month: 'Jun', users: 980 },
  { month: 'Jul', users: 1150 },
  { month: 'Aug', users: 1200 },
  { month: 'Sep', users: 1180 },
  { month: 'Oct', users: 1280 },
  { month: 'Nov', users: 1350 },
  { month: 'Dec', users: 1420 }
];

const newUserProjections = [
  { year: '2022', users: 180 },
  { year: '2023', users: 220 },
  { year: '2024', users: 165 },
  { year: '2025', users: 195 },
  { year: '2026', users: 210 }
];

const userRatingData = [
  { rating: '1 Star', count: 45 },
  { rating: '2 Star', count: 35 },
  { rating: '3 Star', count: 80 },
  { rating: '4 Star', count: 120 },
  { rating: '5 Star', count: 150 }
];

export default function AdminReports() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500">SUMMARY REPORT</h1>
          <div className="text-2xl font-bold text-orange-500">ZynCure</div>
        </div>

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Demographics Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">User Demographics</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={userDemographicData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ value }) => `${value}%`}
                >
                  {userDemographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-center items-center">
            <div className="bg-teal-500 text-white rounded-lg p-8 w-full text-center">
              <div className="text-3xl font-bold">₱85,000</div>
              <div className="text-sm opacity-90 mt-2">TOTAL REVENUE</div>
            </div>
          </div>

          {/* User Rating Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">User Rating</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userRatingData}>
                <XAxis dataKey="rating" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row - Trend Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Active Users */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-orange-500 mb-4 uppercase tracking-wide">Monthly Active Users in 2025</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyActiveUsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#4ECDC4" 
                  strokeWidth={3}
                  dot={{ fill: '#4ECDC4', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#4ECDC4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Projected New Users */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-orange-500 mb-4 uppercase tracking-wide">Projected Number of New Users</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={newUserProjections}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="year" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#666' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#4ECDC4" 
                  strokeWidth={3}
                  dot={{ fill: '#4ECDC4', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#4ECDC4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}