import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data, error } = await supabase.rpc('get_my_available_discounts', {
        p_restaurant_id: '4b739c39-95cd-40e8-8f39-b1af52478d9a',
        p_service_type: 'takeaway'
    });
    if (error) {
        console.error("RPC Error:", error.message);
    } else {
        console.log("RPC Data:", data);
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        }
    }
}
test();
