
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Y2R4ZHhheHh4eHh4eHh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjAwMDAwMDAsImV4cCI6MTkyMDAwMDAwMH0.N_2J_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying vw_creative_analysis_complete...');
    const { data, error } = await supabase
        .from('vw_creative_analysis_complete')
        .select('reach, frequency')
        .not('reach', 'is', null)
        .limit(5);

    if (error) {
        console.error('Error querying view:', error.message);
    } else {
        console.log('Success! Found records with reach/frequency:');
        console.table(data);
    }
}

verify();
