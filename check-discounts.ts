import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data, error } = await supabase.from('discounts').select('*').limit(1);
    if (error) {
        console.error("Discounts error:", error.message);
    } else {
        console.log("Discounts exists, columns:", data?.[0] ? Object.keys(data[0]) : "No data, but table exists");
    }
    
    const { data: d2, error: e2 } = await supabase.from('discount_clubs').select('*').limit(1);
    if (e2) {
        console.error("Discount clubs error:", e2.message);
    } else {
        console.log("Discount clubs exists, columns:", d2?.[0] ? Object.keys(d2[0]) : "No data, but table exists");
    }
}
test();
