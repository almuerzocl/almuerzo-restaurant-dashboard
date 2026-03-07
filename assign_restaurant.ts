import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assign() {
    console.log("Updating restaurant_id for esteban@saborez.cl...");
    const { data, error } = await supabase
        .from('profiles')
        .update({ restaurant_id: '4b739c39-95cd-40e8-8f39-b1af52478d9a' })
        .eq('email', 'esteban@saborez.cl')
        .select();

    if (error) {
        console.error("Error updating profile:", error);
    } else {
        console.log("Profile updated successfully:", data);
    }
}

assign();
