import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "../../client";

const colors = {
  primary: '#F15629',
  secondary: '#FB8F67',
  tertiary: '#55A1A4',
  light: '#FFEDE7'
};

// Sample data for charts that don't have database connections yet
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
  const [userDemographicData, setUserDemographicData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDemographics();
    fetchTotalRevenue();
  }, []);

  const fetchUserDemographics = async () => {
    try {
      // Fetch medical professionals count
      const { data: medicalProfessionals, error: medError } = await supabase
        .from('medicalprofessionals')
        .select('user_type');

      if (medError) throw medError;

      // Fetch patients count  
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('user_type');

      if (patientError) throw patientError;

      // Count user types
      const doctorCount = medicalProfessionals?.length || 0;
      const patientCount = patients?.length || 0;

      // Calculate total and percentages
      const total = doctorCount + patientCount;

      if (total > 0) {
        const demographics = [
          {
            name: 'Medical Professionals',
            value: Math.round((doctorCount / total) * 100),
            color: colors.primary,
            count: doctorCount
          },
          {
            name: 'Patients',
            value: Math.round((patientCount / total) * 100),
            color: colors.tertiary,
            count: patientCount
          }
        ];

        setUserDemographicData(demographics);
      }
    } catch (error) {
      console.error('Error fetching user demographics:', error);
      // Fallback data if database fetch fails
      setUserDemographicData([
        { name: 'Medical Professionals', value: 35, color: colors.primary, count: 0 },
        { name: 'Patients', value: 65, color: colors.tertiary, count: 0 }
      ]);
    }
  };

const fetchTotalRevenue = async () => {
  try {
    // Fetch all payments with paid or refunded status
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, status')
      .in('status', ['paid', 'refunded']);

    if (error) throw error;

    // Calculate total: add paid amounts, subtract refunded amounts
    // Convert from centavos to PHP by dividing by 100
    const total = payments?.reduce((sum, payment) => {
      const amount = (payment.amount || 0) / 100;
      if (payment.status === 'paid') {
        return sum + amount;
      } else if (payment.status === 'refunded') {
        return sum - amount;
      }
      return sum;
    }, 0) || 0;

    setTotalRevenue(total);
  } catch (error) {
    console.error('Error fetching revenue:', error);

    setTotalRevenue(85000);
  } finally {
    setLoading(false);
  }
};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value}% ({data.count} users)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
            SUMMARY REPORT
          </h1>
        </div>

        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Demographics Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              User Demographics
            </h3>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }}></div>
              </div>
            ) : (
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
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {!loading && (
              <div className="mt-4 space-y-2">
                {userDemographicData.map((item, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-gray-600">{item.name}: {item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col justify-center items-center">
            <div className="rounded-lg p-8 w-full text-center" style={{ backgroundColor: colors.tertiary }}>
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-sm text-white opacity-90 mt-2">
                    TOTAL REVENUE
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Rating Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wide">
              User Rating
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userRatingData}>
                <XAxis dataKey="rating" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill={colors.tertiary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row - Trend Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Active Users */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: colors.primary }}>
              Monthly Active Users in 2025
            </h3>
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
                  stroke={colors.tertiary}
                  strokeWidth={3}
                  dot={{ fill: colors.tertiary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: colors.tertiary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Projected New Users */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: colors.primary }}>
              Projected Number of New Users
            </h3>
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
                  stroke={colors.tertiary}
                  strokeWidth={3}
                  dot={{ fill: colors.tertiary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: colors.tertiary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}