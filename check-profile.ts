import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q } = await supabase.from('profiles').select('email, restaurant_id').eq('email', 'esteban@saborez.cl').single();
    if (q) console.log("User restaurant_id:", q.restaurant_id);
    else console.log("User not found");
}
test();
