import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data, error } = await supabase.rpc('get_tables'); // Hypothetical RPC
    // If no RPC, let's try a common query
    const { data: tables, error: e } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
    if (e) {
        console.log("Error querying tables:", e.message);
        // Fallback: try to list common names
        const names = ['payment_methods', 'payment_options', 'discounts', 'discount_clubs', 'restaurant_discounts', 'offers', 'promotions'];
        for (const name of names) {
            const { error: e2 } = await supabase.from(name).select('id').limit(1);
            if (!e2) console.log(`Table exists: ${name}`);
        }
    } else {
        console.log("Tables:", tables.map((t: any) => t.tablename));
    }
}
test();
