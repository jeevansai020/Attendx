// AttendX – Supabase Configuration
// Replace with your project credentials from supabase.com/dashboard
const SUPABASE_URL      = 'https://kxrjruzlzhprbihkuavx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cmpydXpsemhwcmJpaGt1YXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzk0OTQsImV4cCI6MjA5MTA1NTQ5NH0.TxjcJyCmXugHmyAzoP29h_M50d7WaMJawkgb86wpFZU';

// App constants
const APP_CONFIG = {
  name:          'AttendX',
  version:       '2.0.0',
  minAttendance: 75,
  warnThreshold: 80,
  draftTimeout:  30, // minutes before auto-save prompt
};
