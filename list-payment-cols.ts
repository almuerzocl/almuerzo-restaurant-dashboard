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
        console.error("Error fetching payment_options:", error);
    } else {
        console.log("payment_options columns:", q?.[0] ? Object.keys(q[0]) : "No data but table exists");
    }
}
test();
