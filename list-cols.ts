import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
    const { data: q } = await supabase.from('takeaway_orders').select('*').limit(1);
    // Since there's no data, let's try a schema query or another way.
    // Actually, maybe I can just guess or check `dashboard-actions.ts`.
    // Wait, `updateTakeawayStatusAction` mentions order.total_amount.
}
test();
