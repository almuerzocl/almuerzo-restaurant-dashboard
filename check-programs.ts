import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data, error } = await supabase.from('discount_programs').select('*').limit(1);
    if (error) {
        console.error("discount_programs error:", error.message);
    } else {
        console.log("discount_programs exists, columns:", data?.[0] ? Object.keys(data[0]) : "No data, but table exists");
    }
}
test();
