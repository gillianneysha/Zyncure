import { createClient } from '@supabase/supabase-js'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey)

export const symptomDataService = {
    
    async getSymptomLogs(patientId) {
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .order('date_logged', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching symptom logs:', error);
            return [];
        }
    },

    
    async getSymptomsByType(patientId, symptomType) {
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('*')
                .eq('patients_id', patientId)
                .eq('symptoms', symptomType)
                .order('date_logged', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching ${symptomType} symptoms:`, error);
            return [];
        }
    },

   
    async addSymptomLog(patientId, symptomType, severity) {
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .insert([
                    {
                        patients_id: patientId,
                        symptoms: symptomType,
                        severity: severity,
                        date_logged: new Date().toISOString().split('T')[0]
                    }
                ])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding symptom log:', error);
            return null;
        }
    },

    
    async getSymptomStats(patientId) {
        try {
            const { data, error } = await supabase
                .from('symptomlog')
                .select('symptoms, severity')
                .eq('patients_id', patientId);

            if (error) throw error;

            
            const stats = {
                period: { Light: 0, Moderate: 0, Heavy: 0 },
                feelings: { Happy: 0, Fine: 0, 'Mood Swings': 0, Sad: 0 },
                skin: { Normal: 0, Oily: 0, Acne: 0, Dry: 0 },
                metabolism: { Healthy: 0, 'High Sugar': 0, Overweight: 0, 'Metabolic Risk': 0 }
            };

            data.forEach(log => {
                const symptom = log.symptoms.toLowerCase();
                if (stats[symptom] && stats[symptom].hasOwnProperty(log.severity)) {
                    stats[symptom][log.severity]++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error fetching symptom stats:', error);
            return null;
        }
    }
};