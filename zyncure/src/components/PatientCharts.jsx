import React, { useState, useEffect } from 'react';
import { supabase } from '../client';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
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
            console.log('=== STARTING FETCH SYMPTOM DATA ===');
            
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError) {
                console.error('Auth error:', authError);
                setLoading(false);
                return;
            }

            if (!user) {
                console.log('No authenticated user found');
                setSymptomData([]);
                setLoading(false);
                return;
            }

            setCurrentUser(user);
            console.log('=== USER INFO ===');
            console.log('Current user:', user);
            console.log('User ID:', user.id);
            console.log('User ID type:', typeof user.id);
            console.log('User ID length:', user.id.length);

            // Test basic connection to database - FIXED COUNT SYNTAX
            console.log('=== TESTING DATABASE CONNECTION ===');
            const { count, error: testError } = await supabase
                .from('symptomlog')
                .select('*', { count: 'exact', head: true });

            console.log('Database test result:', { count, testError });

            // Get ALL data to see what's in the database
            console.log('=== FETCHING ALL DATA ===');
            const { data: allData, error: allError } = await supabase
                .from('symptomlog')
                .select('*')
                .order('date_logged', { ascending: false }); // Added ordering

            console.log('All data query result:', {
                error: allError,
                totalRecords: allData?.length || 0,
                allData: allData
            });

            if (allData && allData.length > 0) {
                console.log('=== ANALYZING ALL DATA ===');
                const uniquePatientIds = [...new Set(allData.map(item => item.patients_id))];
                console.log('All unique patient IDs found:', uniquePatientIds);
                
                uniquePatientIds.forEach(id => {
                    console.log(`Patient ID: ${id} (type: ${typeof id}, length: ${id?.length || 'N/A'})`);
                    console.log(`Matches current user: ${id === user.id}`);
                    console.log(`String comparison: ${id?.toString() === user.id.toString()}`);
                });

                // Count records per patient
                const patientCounts = {};
                allData.forEach(record => {
                    const patientId = record.patients_id;
                    patientCounts[patientId] = (patientCounts[patientId] || 0) + 1;
                });
                console.log('Records per patient:', patientCounts);
            }

            // Try multiple query variations
            console.log('=== TRYING DIFFERENT QUERY METHODS ===');

            // Method 1: Direct equality with ordering
            const { data: method1Data, error: method1Error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', user.id)
                .order('date_logged', { ascending: false });

            console.log('Method 1 (direct equality):', {
                error: method1Error,
                count: method1Data?.length || 0,
                data: method1Data
            });

            // Method 2: Using RLS policy check - ensure user can see their data
            const { data: method2Data, error: method2Error } = await supabase
                .from('symptomlog')
                .select('*')
                .order('date_logged', { ascending: false });

            console.log('Method 2 (all data with RLS):', {
                error: method2Error,
                count: method2Data?.length || 0,
                data: method2Data
            });

            // Method 3: Check if RLS is causing issues by trying without filters
            const { data: method3Data, error: method3Error } = await supabase
                .from('symptomlog')
                .select('log_id, patients_id, symptoms, severity, date_logged')
                .limit(10);

            console.log('Method 3 (limited fields, no filter):', {
                error: method3Error,
                count: method3Data?.length || 0,
                data: method3Data
            });

            // Determine which data to use
            let finalData = [];
            
            if (method1Data && method1Data.length > 0) {
                finalData = method1Data;
                console.log('Using Method 1 data (filtered by user)');
            } else if (method2Data && method2Data.length > 0) {
                // Filter manually if RLS didn't work as expected
                finalData = method2Data.filter(item => item.patients_id === user.id);
                console.log('Using Method 2 data (filtered manually)');
            } else if (method3Data && method3Data.length > 0) {
                // For debugging - use sample data but filter by user
                finalData = method3Data.filter(item => item.patients_id === user.id);
                console.log('Using Method 3 data (debug sample)');
            } else {
                console.log('No data found for current user');
                finalData = [];
            }

            console.log('=== FINAL RESULT ===');
            console.log('Final data to be set:', finalData);
            console.log('Final data count:', finalData.length);
            
            setSymptomData(finalData);
            
        } catch (err) {
            console.error('Unexpected error in fetchSymptomData:', err);
            setSymptomData([]);
        } finally {
            setLoading(false);
        }
    };

    // Process data for Period chart
    const processPeriodData = () => {
        const periodData = symptomData.filter(item => item.symptoms === 'Period');
        console.log('Period data found:', periodData);
        
        const counts = { Light: 0, Moderate: 0, Heavy: 0 };

        periodData.forEach(item => {
            const severity = item.severity;
            if (severity in counts) {
                counts[severity]++;
            }
        });

        const result = Object.entries(counts)
            .map(([name, value]) => ({
                name,
                value,
                color: name === 'Light' ? '#FFB6C1' : name === 'Moderate' ? '#FF69B4' : '#DC143C'
            }))
            .filter(item => item.value > 0);

        console.log('Processed period data:', result);
        return result;
    };

    // Process data for Feelings chart
    const processFeelingsData = () => {
        const feelingsData = symptomData.filter(item => item.symptoms === 'Feelings');
        console.log('Feelings data found:', feelingsData);
        
        const dailyFeelings = {};

        feelingsData.forEach(item => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            dailyFeelings[date] = item.severity;
        });

        const result = Object.entries(dailyFeelings).map(([date, feeling]) => ({
            date,
            feeling,
            value: feeling === 'Happy' ? 4 : feeling === 'Fine' ? 3 : feeling === 'Mood Swings' ? 2 : 1
        }));

        console.log('Processed feelings data:', result);
        return result;
    };

    // Process data for Skin chart
    const processSkinData = () => {
        const skinData = symptomData.filter(item => item.symptoms === 'Skin');
        console.log('Skin data found:', skinData);
        
        const counts = { Normal: 0, Oily: 0, Dry: 0, Acne: 0 };

        skinData.forEach(item => {
            const severity = item.severity;
            if (severity in counts) {
                counts[severity]++;
            }
        });

        const result = Object.entries(counts)
            .map(([condition, count]) => ({
                condition,
                count,
                fill: condition === 'Normal' ? '#10B981' : condition === 'Oily' ? '#F59E0B' :
                    condition === 'Dry' ? '#EF4444' : '#8B5CF6'
            }))
            .filter(item => item.count > 0);

        console.log('Processed skin data:', result);
        return result;
    };

    // Process data for Metabolism chart
    const processMetabolismData = () => {
        const metabolismData = symptomData.filter(item => item.symptoms === 'Metabolism');
        console.log('Metabolism data found:', metabolismData);
        
        const timelineData = {};

        metabolismData.forEach(item => {
            const date = new Date(item.date_logged).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            timelineData[date] = item.severity;
        });

        const result = Object.entries(timelineData).map(([date, status]) => ({
            date,
            status,
            risk: status === 'Healthy' ? 1 : status === 'High Sugar' ? 3 :
                status === 'Overweight' ? 2 : status === 'Metabolic Risk' ? 4 : 2
        }));

        console.log('Processed metabolism data:', result);
        return result;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500"></div>
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
                        You need to be logged in to view your symptom charts.
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
                        No Data Yet
                    </h3>
                    <p className="text-blue-700">
                        Start tracking your symptoms to see charts and insights here.
                    </p>
                    <div className="mt-4 text-sm text-blue-600">
                        <p>Debug info:</p>
                        <p>Current user ID: {currentUser?.id}</p>
                        <p>Check console for more details</p>
                    </div>
                </div>
            </div>
        );
    }

    const periodData = processPeriodData();
    const feelingsData = processFeelingsData();
    const skinData = processSkinData();
    const metabolismData = processMetabolismData();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Enhanced Debug info */}
            {/* <div className="col-span-full bg-gray-50 p-4 rounded-lg text-sm">
                <strong>Debug Info:</strong> 
                <br />User: {currentUser?.id} 
                <br />Total Records: {symptomData.length} 
                <br />Period: {periodData.length} | Feelings: {feelingsData.length} | Skin: {skinData.length} | Metabolism: {metabolismData.length}
                <br />Sample patient IDs in data: {[...new Set(symptomData.slice(0, 3).map(item => item.patients_id))].join(', ')}
            </div> */}

            {/* Period Tracking - Pie Chart */}
            {periodData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Period Flow Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={periodData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {periodData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Feelings Tracking - Line Chart */}
            {feelingsData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Mood Tracking Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={feelingsData}>
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
            )}

            {/* Skin Condition - Bar Chart */}
            {skinData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Skin Condition Frequency
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={skinData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="condition" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Metabolism Tracking - Area Chart */}
            {metabolismData.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Metabolism Risk Timeline
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={metabolismData}>
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
            )}
        </div>
    );
};

export default PatientCharts;