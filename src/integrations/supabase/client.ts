// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bxlhlwospiajyqaqipaq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bGhsd29zcGlhanlxYXFpcGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTY1MzgsImV4cCI6MjA2NDYzMjUzOH0.lAr-ASATprwWXm-YQ8P-VTLtEggyrOjrELBGoFDV2bQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);