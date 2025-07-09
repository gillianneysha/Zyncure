import React, { useState, useEffect } from 'react';
import { supabase } from '../client';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter,
    ComposedChart
} from 'recharts';


const PatientCharts = () => {
    const [symptomData, setSymptomData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);


    useEffect(() => {
        fetchSymptomData();
    }, []);


    const fetchSymptomData = async () => {
        try {
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();


            if (authError || !user) {
                console.error('Auth error:', authError?.message);
                setLoading(false);
                return;
            }


            setCurrentUser(user);


            // Fetch symptom data for current user
            const { data: symptomLogs, error: fetchError } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', user.id)
                .order('date_logged', { ascending: false });


            if (fetchError) {
                console.error('Error fetching symptom data:', fetchError.message);
                setSymptomData([]);
            } else {
                setSymptomData(symptomLogs || []);
            }


        } catch (err) {
            console.error('Unexpected error in fetchSymptomData:', err);
            setSymptomData([]);
        } finally {
            setLoading(false);
        }
    };


    // Process data for Period Flow chart
    const processPeriodFlowData = () => {
        const periodData = symptomData
            .filter(item => item.symptoms === 'Period Flow')
            .sort((a, b) => new Date(a.date_logged) - new Date(b.date_logged));


        return periodData.map(item => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });


            // Convert flow intensity to numeric value for line chart
            const flowValue = {
                'Light': 1,
                'Moderate': 2,
                'Heavy': 3,
                'Extremely Heavy': 4
            }[item.severity] || 0;


            return {
                date,
                flow: item.severity,
                value: flowValue,
                fullDateTime: new Date(item.date_logged).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        });
    };


    // Process data for PCOS Symptoms frequency
    const processSymptomFrequency = () => {
        const symptomData_filtered = symptomData.filter(item => item.symptoms === 'Symptoms');
        const counts = {};


        symptomData_filtered.forEach(item => {
            const symptom = item.severity;
            counts[symptom] = (counts[symptom] || 0) + 1;
        });


        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE', '#FD79A8'
        ];


        return Object.entries(counts)
            .map(([symptom, count], index) => ({
                symptom: symptom.length > 12 ? symptom.substring(0, 12) + '...' : symptom,
                fullName: symptom,
                count,
                fill: colors[index % colors.length]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8); // Top 8 symptoms
    };


    // Process data for Mood tracking over time
    const processMoodTimeline = () => {
        const feelingsData = symptomData
            .filter(item => item.symptoms === 'Feelings')
            .sort((a, b) => new Date(a.date_logged) - new Date(b.date_logged));


        return feelingsData.map(item => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });


            // Convert mood to numeric value for charting
            const moodValue = {
                'Energized': 5,
                'Happy': 4,
                'Calm': 3,
                'Mood swings': 2,
                'Anxiety': 1,
                'Sad': 1,
                'Exhausted': 1
            }[item.severity] || 3;


            return {
                date,
                mood: item.severity,
                value: moodValue,
                fullDateTime: new Date(item.date_logged).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        });
    };


    // Process data for Energy levels over time (updated for ComposedChart)
    const processEnergyLevels = () => {
        const energyData = symptomData
            .filter(item => item.symptoms === 'Energy')
            .sort((a, b) => new Date(a.date_logged) - new Date(b.date_logged));


        // Group by date and count occurrences
        const groupedByDate = energyData.reduce((acc, item) => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });


            if (!acc[date]) {
                acc[date] = {
                    date,
                    exhausted: 0,
                    tired: 0,
                    ok: 0,
                    energetic: 0,
                    total: 0,
                    fullDateTime: new Date(item.date_logged).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                };
            }


            const energy = item.severity.toLowerCase();
            if (energy in acc[date]) {
                acc[date][energy]++;
                acc[date].total++;
            }


            return acc;
        }, {});


        return Object.values(groupedByDate);
    };


    // Process data for Weight tracking
    const processWeightData = () => {
        const weightData = symptomData
            .filter(item => item.symptoms === 'Weight' && item.severity)
            .sort((a, b) => new Date(a.date_logged) - new Date(b.date_logged));


        return weightData.map(item => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });


            // Extract numeric weight value
            const weightMatch = item.severity.match(/(\d+(?:\.\d+)?)/);
            const weight = weightMatch ? parseFloat(weightMatch[1]) : null;


            return {
                date,
                weight,
                unit: item.severity.includes('kg') ? 'kg' : 'lbs',
                fullDateTime: new Date(item.date_logged).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
        }).filter(item => item.weight !== null);
    };


    // Process data for Cravings distribution
    const processCravingsData = () => {
        const cravingsData = symptomData.filter(item => item.symptoms === 'Cravings');
        const counts = {};


        cravingsData.forEach(item => {
            const craving = item.severity;
            counts[craving] = (counts[craving] || 0) + 1;
        });


        return Object.entries(counts)
            .map(([craving, count]) => ({
                craving,
                count,
                fill: {
                    'Salty': '#FFA500',
                    'Sweet': '#FF69B4',
                    'Meat': '#8B4513',
                    'Fruit': '#32CD32',
                    'Fried things': '#FFD700',
                    'Chocolate': '#D2691E'
                }[craving] || '#999999'
            }));
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }


    if (!currentUser) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        Please Log In
                    </h3>
                    <p className="text-yellow-700">
                        You need to be logged in to view your PCOS tracking charts.
                    </p>
                </div>
            </div>
        );
    }


    if (symptomData.length === 0) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Start Your PCOS Journey
                    </h3>
                    <p className="text-blue-700">
                        Begin tracking your symptoms, mood, and cycle to see personalized insights here.
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                        Track period flow, symptoms, feelings, energy, weight, and cravings to get comprehensive health insights.
                    </p>
                </div>
            </div>
        );
    }


    const periodFlowData = processPeriodFlowData();
    const symptomFrequencyData = processSymptomFrequency();
    const moodTimelineData = processMoodTimeline();
    const energyLevelsData = processEnergyLevels();
    const weightData = processWeightData();
    const cravingsData = processCravingsData();


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Health Dashboard</h2>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Period Flow Timeline */}
                {periodFlowData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-pink-100 chart-container" data-chart-title="Period Flow Timeline">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                            Period Flow Timeline
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart
                                data={periodFlowData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis
                                    domain={[0, 5]}
                                    tickFormatter={(value) => {
                                        const flows = ['', 'Light', 'Moderate', 'Heavy', 'Extremely Heavy'];
                                        return flows[value] || '';
                                    }}
                                />
                                <Tooltip
                                    formatter={(value, name, props) => [props.payload.flow, 'Flow Intensity']}
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullDateTime || label;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#EC4899"
                                    fill="#EC4899"
                                    fillOpacity={0.5}
                                    dot={{ fill: '#EC4899', strokeWidth: 5, r: 3 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            Track your period flow intensity over time to identify patterns and irregularities.
                        </p>
                    </div>
                )}


                {/* PCOS Symptoms Distribution */}
                {symptomFrequencyData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100 chart-container" data-chart-title="PCOS Symptoms Distribution">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                            PCOS Symptoms Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={symptomFrequencyData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ fullName, percent }) => `${fullName} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {symptomFrequencyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name, props) => [value, 'Occurrences']}
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullName || label;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            See which symptoms occur most frequently to discuss patterns with your healthcare provider.
                        </p>
                    </div>
                )}


                {/* Mood Timeline */}
                {moodTimelineData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 chart-container" data-chart-title="Mood Tracking Over Time">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                            Mood Tracking Over Time
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={moodTimelineData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis
                                    domain={[0, 6]}
                                    tickFormatter={(value) => {
                                        const moods = ['', 'Low', 'Anxious', 'Neutral', 'Good', 'Energized'];
                                        return moods[value] || '';
                                    }}
                                />
                                <Tooltip
                                    formatter={(value, name, props) => [props.payload.mood, 'Mood']}
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullDateTime || label;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5 }}
                                    name="Mood Level"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            PCOS can affect mood due to hormonal changes. Track patterns to better manage emotional wellbeing.
                        </p>
                    </div>
                )}


                {/* Energy Levels Distribution - Updated to ComposedChart */}
                {energyLevelsData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100 chart-container" data-chart-title="Energy Levels Over Time">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                            Energy Levels Over Time
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart
                                data={energyLevelsData}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    bottom: 20,
                                    left: 20,
                                }}
                            >
                                <CartesianGrid stroke="#f5f5f5" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullDateTime || label;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="exhausted" stackId="a" fill="#EF4444" />
                                <Bar dataKey="tired" stackId="a" fill="#F59E0B" />
                                <Bar dataKey="ok" stackId="a" fill="#10B981" />
                                <Bar dataKey="energetic" stackId="a" fill="#22C55E" />
                                <Line type="monotone" dataKey="total" stroke="#ff7300" strokeWidth={2} />
                            </ComposedChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            Track your energy levels over time to identify patterns and optimize daily activities.
                        </p>
                    </div>
                )}


                {/* Weight Tracking */}
                {weightData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 chart-container" data-chart-title="Weight Management Progress">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                            Weight Management Progress
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={weightData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value, name, props) => [
                                        `${value} ${props.payload.unit}`,
                                        'Weight'
                                    ]}
                                    labelFormatter={(label, payload) => {
                                        const item = payload?.[0]?.payload;
                                        return item?.fullDateTime || label;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="#F46B5D"
                                    strokeWidth={2}
                                    dot={{ fill: '#F46B5D', strokeWidth: 2, r: 4 }}
                                    name="Weight"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            PCOS can make weight management challenging. Track changes to support your health goals.
                        </p>
                    </div>
                )}


                {/* Cravings Distribution */}
                {cravingsData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-yellow-100 chart-container" data-chart-title="Food Cravings Pattern">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                            Food Cravings Pattern
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cravingsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="craving" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-sm text-gray-600 mt-2">
                            PCOS can influence cravings due to insulin resistance. Understanding patterns helps with dietary planning.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default PatientCharts;
