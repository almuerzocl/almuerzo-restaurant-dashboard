import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q, error } = await supabase.from('discounts').select('*').limit(1);
    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("Columns:", q && q.length > 0 ? Object.keys(q[0]) : "No data in table");
    }
}
test();
