import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data } = await supabase.from('profiles').select('email, role').not('role', 'is', null).limit(10);
    console.log("Profile roles:", data);
}
test();
