import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const today = new Date().toISOString().split('T')[0];
    const { count: events } = await supabase.from('restaurant_analytics_events').select('*', { count: 'exact', head: true }).gte('created_at', today);
    const { count: orders } = await supabase.from('takeaway_orders').select('*', { count: 'exact', head: true }).gte('created_at', today);
    const { count: res } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', today);
    
    console.log(`Data for ${today}:`);
    console.log(`Events: ${events}`);
    console.log(`Orders: ${orders}`);
    console.log(`Reservations: ${res}`);
}
test();
