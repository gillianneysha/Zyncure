import { createClient } from '@supabase/supabase-js'


let supabaseInstance = null;

const getSupabaseClient = () => {
    if (!supabaseInstance) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        supabaseInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        });
    }
    return supabaseInstance;
};

export const symptomDataService = {
  
    subscribeToSymptomChanges(patientId, callback) {
        const supabase = getSupabaseClient();
        const channel = supabase
            .channel(`patient_${patientId}_symptoms`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'symptomlog',
                    filter: `patients_id=eq.${patientId}`
                },
                callback
            )
            .subscribe((status, err) => {
                if (err) console.error('Subscription error:', err);
            });

        return channel;
    },

    unsubscribe(subscription) {
        if (subscription) {
            const supabase = getSupabaseClient();
            supabase.removeChannel(subscription);
        }
    },

    
    async getSymptomLogs(patientId) {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .order('date_logged', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching symptom logs:', error);
            throw error;
        }
    },

    async getSymptomsByType(patientId, symptomType) {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .eq('symptoms', symptomType)
                .order('date_logged', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Error fetching ${symptomType} symptoms:`, error);
            throw error;
        }
    },

    async addSymptomLog(patientId, symptomType, severity, dateLogged = new Date()) {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .insert([{
                    patients_id: patientId,
                    symptoms: symptomType,
                    severity: severity,
                    date_logged: dateLogged.toISOString()
                }])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding symptom log:', error);
            throw error;
        }
    },

    async updateSymptomLog(logId, updates) {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .update(updates)
                .eq('log_id', logId)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating symptom log:', error);
            throw error;
        }
    },

    async deleteSymptomLog(logId) {
        const supabase = getSupabaseClient();
        try {
            const { error } = await supabase
                .from('symptomlog')
                .delete()
                .eq('log_id', logId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting symptom log:', error);
            throw error;
        }
    },

    async getSymptomStats(patientId) {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .order('date_logged', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                return {
                    totalLogs: 0,
                    lastLogged: 'Never',
                    mostCommon: 'None',
                    recentMood: 'Unknown'
                };
            }

            const totalLogs = data.length;
            const lastLogged = data[0] ? new Date(data[0].date_logged).toLocaleDateString() : 'Never';

            const symptomCounts = {};
            data.forEach(log => {
                symptomCounts[log.symptoms] = (symptomCounts[log.symptoms] || 0) + 1;
            });

            const mostCommon = Object.keys(symptomCounts).length > 0
                ? Object.keys(symptomCounts).reduce((a, b) => symptomCounts[a] > symptomCounts[b] ? a : b)
                : 'None';

            const recentMoodLog = data.find(log => log.symptoms === 'Feelings');
            const recentMood = recentMoodLog ? recentMoodLog.severity : 'Unknown';

            return {
                totalLogs,
                lastLogged,
                mostCommon,
                recentMood,
                weeklyData: this.processChartData(data.filter(log =>
                    new Date(log.date_logged) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                )),
                monthlyData: this.processChartData(data.filter(log =>
                    new Date(log.date_logged) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ))
            };
        } catch (error) {
            console.error('Error fetching symptom stats:', error);
            throw error;
        }
    },

    processChartData(data) {
        const processed = {
            period: { Light: 0, Moderate: 0, Heavy: 0 },
            feelings: { Happy: 0, Fine: 0, 'Mood Swings': 0, Sad: 0 },
            skin: { Normal: 0, Oily: 0, Acne: 0, Dry: 0 },
            metabolism: { Healthy: 0, 'High Sugar': 0, Overweight: 0, 'Metabolic Risk': 0 },
            timeline: []
        };

        data.forEach(log => {
            const symptom = log.symptoms.toLowerCase();
            if (processed[symptom] && processed[symptom][log.severity] !== undefined) {
                processed[symptom][log.severity]++;
            }
        });

        const timelineMap = new Map();
        data.forEach(log => {
            const date = new Date(log.date_logged).toISOString().split('T')[0];
            if (!timelineMap.has(date)) {
                timelineMap.set(date, {});
            }
            timelineMap.get(date)[log.symptoms] = log.severity;
        });

        processed.timeline = Array.from(timelineMap.entries())
            .map(([date, symptoms]) => ({ date, ...symptoms }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return processed;
    },

    async getCurrentUser() {
        const supabase = getSupabaseClient();
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    },

    async getSymptomForDate(patientId, symptomType, date) {
        const supabase = getSupabaseClient();
        try {
            const dateStr = date.toISOString().split("T")[0];
            const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .eq('symptoms', symptomType)
                .gte('date_logged', dateStr)
                .lt('date_logged', nextDay);

            if (error) throw error;
            return data?.[0] || null;
        } catch (error) {
            console.error('Error checking symptom for date:', error);
            throw error;
        }
    }
};
