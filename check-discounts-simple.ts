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
        console.log("Error discounts:", error.message);
    } else {
        console.log("discounts exists!");
    }
    
    const { data: data2, error: error2 } = await supabase.from('payment_options').select('*').limit(1);
    if (error2) {
        console.log("Error payment_options:", error2.message);
    } else {
        console.log("payment_options exists!");
    }
}
test();
