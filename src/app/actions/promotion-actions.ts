"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Promotion {
    id: string;
    label: string;
    description: string;
    discount_percentage: number;
    is_active: boolean;
    restaurant_id: string | null;
    institution_id: string | null;
    service_scope: string[];
    valid_days: string[];
    start_date: string | null;
    end_date: string | null;
    type: 'promotion' | 'coupon' | 'club';
    created_at: string;
}

export async function getPromotionsAction(restaurantId: string) {
    try {
        const supabase = await createClient();

        // 1. Fetch Local Promotions
        const { data: localData, error: localError } = await supabase
            .from("discounts")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false });

        if (localError) throw localError;

        // 2. Fetch Global Promotions
        const { data: globalData, error: globalError } = await supabase
            .from("discounts")
            .select("*")
            .is("restaurant_id", null)
            .eq("is_active", true);

        if (globalError) throw globalError;

        // 3. Fetch Opted-in Global Promotions
        const { data: optInData, error: optInError } = await supabase
            .from("restaurant_global_discounts")
            .select("discount_id, is_active")
            .eq("restaurant_id", restaurantId);

        if (optInError) throw optInError;

        const optedInIds = new Set(optInData?.map(d => d.discount_id) || []);
        const inactiveGlobalIds = new Set(optInData?.filter(d => !d.is_active).map(d => d.discount_id) || []);

        const processedGlobal = (globalData || []).map(promo => ({
            ...promo,
            is_opted_in: optedInIds.has(promo.id),
            is_active_for_restaurant: optedInIds.has(promo.id) && !inactiveGlobalIds.has(promo.id)
        }));

        return { 
            success: true, 
            data: {
                local: localData || [],
                global: processedGlobal
            } 
        };
    } catch (error: any) {
        console.error("Error fetching promotions:", error);
        return { success: false, error: error.message };
    }
}

export async function createPromotionAction(restaurantId: string, promotion: Partial<Promotion>) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("discounts")
            .insert({
                ...promotion,
                restaurant_id: restaurantId,
                is_active: true,
                type: 'promotion'
            });

        if (error) throw error;
        revalidatePath("/dashboard/promotions");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating promotion:", error);
        return { success: false, error: error.message };
    }
}

export async function togglePromotionStatusAction(promotionId: string, isActive: boolean) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("discounts")
            .update({ is_active: isActive })
            .eq("id", promotionId);

        if (error) throw error;
        revalidatePath("/dashboard/promotions");
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling promotion status:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleGlobalOptInAction(restaurantId: string, discountId: string, isOptedIn: boolean) {
    try {
        const supabase = await createClient();
        
        if (isOptedIn) {
            const { error } = await supabase
                .from("restaurant_global_discounts")
                .upsert({
                    restaurant_id: restaurantId,
                    discount_id: discountId,
                    is_active: true
                });
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("restaurant_global_discounts")
                .delete()
                .eq("restaurant_id", restaurantId)
                .eq("discount_id", discountId);
            if (error) throw error;
        }

        revalidatePath("/dashboard/promotions");
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling global opt-in:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePromotionAction(promotionId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("discounts")
            .delete()
            .eq("id", promotionId);

        if (error) throw error;
        revalidatePath("/dashboard/promotions");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting promotion:", error);
        return { success: false, error: error.message };
    }
}
