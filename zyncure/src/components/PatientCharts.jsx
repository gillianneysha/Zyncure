import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PatientCharts = () => {
    const [symptomData, setSymptomData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch data from Supabase
    useEffect(() => {
        fetchSymptomData();
    }, []);

    const fetchSymptomData = async () => {
        try {
            // Replace with your actual Supabase client and patient_id
            // const { data, error } = await supabase
            //   .from('symptomlog')
            //   .select('*')
            //   .eq('patients_id', currentPatientId)
            //   .order('date_logged', { ascending: true });

            // Sample data structure matching your Supabase table
            const sampleData = [
                { log_id: 1, patients_id: 'uuid1', symptoms: 'Period', severity: 'Light', date_logged: '2024-06-01' },
                { log_id: 2, patients_id: 'uuid1', symptoms: 'Period', severity: 'Moderate', date_logged: '2024-06-02' },
                { log_id: 3, patients_id: 'uuid1', symptoms: 'Feelings', severity: 'Happy', date_logged: '2024-06-01' },
                { log_id: 4, patients_id: 'uuid1', symptoms: 'Feelings', severity: 'Sad', date_logged: '2024-06-03' },
                { log_id: 5, patients_id: 'uuid1', symptoms: 'Skin', severity: 'Normal', date_logged: '2024-06-01' },
                { log_id: 6, patients_id: 'uuid1', symptoms: 'Skin', severity: 'Acne', date_logged: '2024-06-04' },
                { log_id: 7, patients_id: 'uuid1', symptoms: 'Metabolism', severity: 'Healthy', date_logged: '2024-06-01' },
                { log_id: 8, patients_id: 'uuid1', symptoms: 'Metabolism', severity: 'High Sugar', date_logged: '2024-06-05' },
            ];

            setSymptomData(sampleData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching symptom data:', error);
            setLoading(false);
        }
    };

    // Process data for different chart types
    const processPeriodData = () => {
        const periodData = symptomData.filter(item => item.symptoms === 'Period');
        const counts = { Light: 0, Moderate: 0, Heavy: 0 };

        periodData.forEach(item => {
            if (counts.hasOwnProperty(item.severity)) {
                counts[item.severity]++;
            }
        });

        return Object.entries(counts).map(([name, value]) => ({
            name,
            value,
            color: name === 'Light' ? '#FFB6C1' : name === 'Moderate' ? '#FF69B4' : '#DC143C'
        }));
    };

    const processFeelingsData = () => {
        const feelingsData = symptomData.filter(item => item.symptoms === 'Feelings');
        const dailyFeelings = {};

        feelingsData.forEach(item => {
            const date = new Date(item.date_logged).toLocaleDateString();
            dailyFeelings[date] = item.severity;
        });

        return Object.entries(dailyFeelings).map(([date, feeling]) => ({
            date,
            feeling,
            value: feeling === 'Happy' ? 4 : feeling === 'Fine' ? 3 : feeling === 'Mood Swings' ? 2 : 1
        }));
    };

    const processSkinData = () => {
        const skinData = symptomData.filter(item => item.symptoms === 'Skin');
        const counts = { Normal: 0, Oily: 0, Dry: 0, Acne: 0 };

        skinData.forEach(item => {
            if (counts.hasOwnProperty(item.severity)) {
                counts[item.severity]++;
            }
        });

        return Object.entries(counts).map(([condition, count]) => ({
            condition,
            count,
            fill: condition === 'Normal' ? '#10B981' : condition === 'Oily' ? '#F59E0B' :
                condition === 'Dry' ? '#EF4444' : '#8B5CF6'
        }));
    };

    const processMetabolismData = () => {
        const metabolismData = symptomData.filter(item => item.symptoms === 'Metabolism');
        const timelineData = {};

        metabolismData.forEach(item => {
            const date = new Date(item.date_logged).toLocaleDateString();
            timelineData[date] = item.severity;
        });

        return Object.entries(timelineData).map(([date, status]) => ({
            date,
            status,
            risk: status === 'Healthy' ? 1 : status === 'High Sugar' ? 3 :
                status === 'Overweight' ? 2 : status === 'Metabolic Risk' ? 4 : 2
        }));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

            {/* Period Tracking - Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Period Flow Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={processPeriodData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {processPeriodData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Feelings Tracking - Line Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Mood Tracking Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={processFeelingsData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis
                            domain={[0, 5]}
                            tickFormatter={(value) => {
                                const moods = ['', 'Sad', 'Mood Swings', 'Fine', 'Happy'];
                                return moods[value] || '';
                            }}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const moods = ['', 'Sad', 'Mood Swings', 'Fine', 'Happy'];
                                return [moods[value], 'Mood'];
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#FF6B9D"
                            strokeWidth={3}
                            dot={{ fill: '#FF6B9D', strokeWidth: 2, r: 6 }}
                            name="Mood Level"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Skin Condition - Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Skin Condition Frequency
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processSkinData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="condition" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Metabolism Tracking - Area Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Metabolism Risk Timeline
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={processMetabolismData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis
                            domain={[0, 5]}
                            tickFormatter={(value) => {
                                const levels = ['', 'Healthy', 'Overweight', 'High Sugar', 'Metabolic Risk'];
                                return levels[value] || '';
                            }}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const levels = ['', 'Healthy', 'Overweight', 'High Sugar', 'Metabolic Risk'];
                                return [levels[value], 'Risk Level'];
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="risk"
                            stroke="#F59E0B"
                            fill="#F59E0B"
                            fillOpacity={0.6}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PatientCharts;