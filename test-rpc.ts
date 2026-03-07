import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const restaurantId = '4b739c39-95cd-40e8-8f39-b1af52478d9a';
    const startTime = '2026-03-06T00:00:00.000Z';
    const endTime = '2026-03-06T23:59:59.999Z';
    
    console.log("Calling get_restaurant_analytics_report...");
    const { data, error } = await supabase.rpc("get_restaurant_analytics_report", {
        p_restaurant_id: restaurantId,
        p_start_time: startTime,
        p_end_time: endTime
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Data:", JSON.stringify(data, null, 2));
    }
}
test();
