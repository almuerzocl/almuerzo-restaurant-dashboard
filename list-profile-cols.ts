import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profile columns:", q?.[0] ? Object.keys(q[0]) : "No data");
    // To check types we'd need information_schema, but I can guess or try a cast.
}
test();
