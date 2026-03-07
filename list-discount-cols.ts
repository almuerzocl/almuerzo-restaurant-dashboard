import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q, error } = await supabase.from('discount_clubs').select('*').limit(1);
    console.log("discount_clubs columns:", q?.[0] ? Object.keys(q[0]) : "No data, but table exists");
}
test();
