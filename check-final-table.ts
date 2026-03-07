import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q, error } = await supabase.from('payment_options').select('*').limit(1);
    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Columns:", q && q.length > 0 ? Object.keys(q[0]) : "No data, but table exists and schema is loaded");
        // If no data, try to query another table to see if client is ok
        const { data: r } = await supabase.from('restaurants').select('id').limit(1);
        console.log("Restaurant check:", r ? "OK" : "Failed");
    }
}
test();
