"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmailAction } from "./email-actions";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { Profile, Restaurant, Reservation, TakeawayOrder } from "@/types";
import { isAdmin, isSuperAdmin, canViewReservations, canViewTakeaway, canViewMenu } from "@/lib/permissions";

const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
});

/**
 * Skill: Server-Side RBAC Guard
 * Verifies that the caller has an active session and the required permissions
 * to perform an action on a specific restaurant.
 */
async function getAuthContext(restaurantId?: string | null, check?: (profile: Profile) => boolean) {
    const supabase = await createClient();
    
    // Explicitly check for session and user
    // getUser() is the secure way to verify the JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
        // Fallback to getSession for debugging/stale cases, though less secure
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
            console.error("Auth failure: No user or session found", { authError });
            throw new Error(`UNAUTHORIZED: Inicie sesión para continuar. (Auth: ${authError?.message || 'No session'})`);
        }
        
        console.warn("Auth warning: getUser() failed but getSession() succeeded. Token might be stale.");
        return { supabase, user: session.user, profile: await fetchProfileForUser(supabase, session.user.id, restaurantId, check) };
    }

    return { supabase, user, profile: await fetchProfileForUser(supabase, user.id, restaurantId, check) };
}

async function fetchProfileForUser(supabase: any, userId: string, restaurantId?: string | null, check?: (profile: Profile) => boolean) {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        console.error("Profile fetch failure:", profileError, userId);
        throw new Error("FORBIDDEN: Perfil no encontrado.");
    }

    // Role-based check (using centralized helpers)
    if (check && !check(profile)) {
        console.warn("Permission denied for user:", profile.email, profile.role);
        throw new Error("FORBIDDEN: Permisos insuficientes para esta acción.");
    }

    // Restaurant-binding check
    if (restaurantId && profile.restaurant_id && profile.restaurant_id !== restaurantId) {
        const checkIsSuper = Array.isArray(profile.role) ? profile.role.includes('SUPER_ADMIN') : profile.role === 'SUPER_ADMIN';
        if (!checkIsSuper) {
            throw new Error("FORBIDDEN: Solo puede gestionar su propio restaurante.");
        }
    }

    return profile;
}



export async function getDashboardMetricsAction(restaurantId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc("get_restaurant_dashboard_metrics", {
            p_restaurant_id: restaurantId,
            p_current_time: new Date().toISOString()
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching dashboard metrics:", error);
        return { success: false, error: error.message };
    }
}

export async function checkAdvancedAvailabilityAction(
    restaurantId: string,
    time: string,
    partySize: number
) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc("check_advanced_restaurant_availability", {
            p_restaurant_id: restaurantId,
            p_target_time: time,
            p_party_size: partySize
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error checking availability:", error);
        return { success: false, error: error.message };
    }
}

export async function blockSeatsAction(
    restaurantId: string,
    startTime: string,
    endTime: string,
    seats: number,
    reason: string
) {
    try {
        await getAuthContext(restaurantId, isAdmin);
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("reservation_blocks")
            .insert({
                restaurant_id: restaurantId,
                start_time: startTime,
                end_time: endTime,
                blocked_slots: seats,
                reason,
                is_active: true
            });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error blocking seats:", error);
        return { success: false, error: error.message };
    }
}

export async function getReservationBlocksAction(restaurantId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("reservation_blocks")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("start_time", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching blocks:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteReservationBlockAction(blockId: string) {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("reservation_blocks")
            .delete()
            .eq("id", blockId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting block:", error);
        return { success: false, error: error.message };
    }
}

export async function createManualReservationAction(params: {
    restaurantId: string;
    dateTime: string;
    partySize: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    specialRequests?: string;
    status: string;
    userId?: string;
}) {
    try {
        const supabase = await createClient();
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // V5 Rule: Manual reservations always have 100% reputation snapshot for that specific event
        const reputationSnapshot = 100;

        const { error } = await supabase
            .from("reservations")
            .insert({
                restaurant_id: params.restaurantId,
                organizer_id: params.userId || null,
                date_time: params.dateTime,
                party_size: params.partySize,
                organizer_reputation_snapshot: reputationSnapshot,
                guest_data: JSON.stringify([{
                    name: params.customerName,
                    phone: params.customerPhone,
                    email: params.customerEmail,
                    is_manual: true
                }]),
                special_requests: params.specialRequests,
                status: params.status,
                unique_code: code
            });

        if (error) throw error;

        const publicTicketUrl = `https://ticket.almuerzo.cl/v/${code}`;

        // Send Email Proof / Invitation
        if (params.customerEmail) {
            if (params.userId) {
                // REGULAR CONFIRMATION for registered user
                await sendEmailAction({
                    to: params.customerEmail,
                    subject: `🍽️ Reserva Confirmada - ${params.customerName}`,
                    text: `Hola ${params.customerName},\n\nTu reserva ha sido confirmada.\n\nCódigo: ${code}\nLink al Ticket: ${publicTicketUrl}\n\n¡Te esperamos!`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #10b981; font-weight: 900;">¡Tu Reserva está Confirmada!</h2>
                            <p>Hola <strong>${params.customerName}</strong>,</p>
                            <p>Hemos registrado tu reserva manual en el sistema. Al ser usuario de Almuerzo.cl, tu reputación se mantiene protegida.</p>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                                <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; color: #64748b; letter-spacing: 1px;">Código Único</span>
                                <div style="font-size: 32px; font-weight: 900; color: #1e293b;">${code}</div>
                            </div>
                            <p style="text-align: center;">
                                <a href="${publicTicketUrl}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                                    Ver Mi Ticket Público
                                </a>
                            </p>
                        </div>
                    `
                });
            } else {
                // INVITATION + CONFIRMATION for new user
                await sendEmailAction({
                    to: params.customerEmail,
                    subject: `🎁 Tu Ticket y una Invitación Especial - ${params.customerName}`,
                    text: `Hola ${params.customerName},\n\nTu reserva en el restaurante ha sido confirmada.\n\nCódigo: ${code}\nLink al Ticket: ${publicTicketUrl}\n\nAdemás, te invitamos a unirte a Almuerzo.cl para gestionar tus reservas y acceder a beneficios únicos.`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="background: #fef3c7; color: #92400e; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">Invitación de Restaurante</span>
                            </div>
                            <h2 style="color: #1e293b; font-weight: 900;">¡Tu Reserva está Lista!</h2>
                            <p>Hola <strong>${params.customerName}</strong>,</p>
                            <p>El restaurante ha registrado tu reserva. Aquí tienes tu acceso directo:</p>
                            
                            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px dashed #cbd5e1;">
                                <div style="font-size: 32px; font-weight: 900; color: #1e293b;">${code}</div>
                                <a href="${publicTicketUrl}" style="color: #3b82f6; text-decoration: underline; font-size: 14px;">Descargar Ticket</a>
                            </div>

                            <div style="background: #10b981; color: white; padding: 20px; border-radius: 12px; margin-top: 30px;">
                                <h3 style="margin: 0 0 10px 0;">🚀 Únete a Almuerzo.cl</h3>
                                <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">¡No vuelvas a dictar tus datos! Crea tu perfil en segundos y empieza a acumular reputación para reservas priorizadas y clubes de descuento.</p>
                                <a href="https://ticket2.almuerzo.cl/onboarding" style="background: white; color: #10b981; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                                    Aceptar Invitación
                                </a>
                            </div>
                        </div>
                    `
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error creating manual reservation:", error);
        return { success: false, error: error.message };
    }
}

export async function searchProfileByEmailAction(email: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, display_name, reservation_reputation, account_tier, phone, phone_number, total_reservations")
            .eq("email", email)
            .maybeSingle();

        if (error) throw error;
        return { success: true, profile: data };
    } catch (error: any) {
        console.error("Error searching profile:", error);
        return { success: false, error: error.message };
    }
}

export async function getAnalyticsReportAction(
    restaurantId: string,
    startTime: string,
    endTime: string
) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc("get_restaurant_analytics_report", {
            p_restaurant_id: restaurantId,
            p_start_time: startTime,
            p_end_time: endTime
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching analytics report:", error);
        return { success: false, error: error.message };
    }
}

export async function getGA4StatsAction(
    restaurantId: string,
    startDate: string,
    endDate: string
) {
    try {
        const propertyId = process.env.GA_PROPERTY_ID;
        if (!propertyId) {
            return { success: false, error: "GA_PROPERTY_ID no está configurado." };
        }

        const formattedStartDate = startDate.split('T')[0];
        const formattedEndDate = endDate.split('T')[0];

        // Consulta de las sesiones activas en la ruta o evento para el restaurante especificado
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: formattedStartDate,
                    endDate: formattedEndDate,
                },
            ],
            dimensions: [
                {
                    name: "restaurant_id", // Standard GA4 custom dimension name
                },
            ],
            metrics: [
                {
                    name: "sessions",
                },
                {
                    name: "activeUsers",
                }
            ],
            dimensionFilter: {
                filter: {
                    fieldName: "restaurant_id",
                    stringFilter: {
                        value: restaurantId,
                    }
                }
            }
        });

        const activeUsers = response.rows?.[0]?.metricValues?.[1]?.value || "0";
        const sessions = response.rows?.[0]?.metricValues?.[0]?.value || "0";

        // Consulta del total de sesiones de la plataforma (para el promedio)
        const [avgResponse] = await analyticsDataClient.runReport({
             property: `properties/${propertyId}`,
             dateRanges: [
                 {
                     startDate: formattedStartDate,
                     endDate: formattedEndDate,
                 },
             ],
             metrics: [
                 { name: "sessions" },
             ],
         });
         
        const totalPlatformSessions = avgResponse.rows?.[0]?.metricValues?.[0]?.value || "0";

        return {
            success: true,
            data: {
                unique_users: parseInt(activeUsers, 10),
                app_sessions: parseInt(sessions, 10),
                total_platform_sessions: parseInt(totalPlatformSessions, 10),
            }
        };

    } catch (error: any) {
        console.error("Error obteniendo datos de GA4:", error);
        return { success: false, error: error.message };
    }
}

export async function trackAnalyticsEventAction(
    restaurantId: string,
    eventType: 'view_home' | 'view_menu' | 'view_reservations' | 'view_takeaway' | 'view_reports' | 'reservation_start' | 'reservation_confirm' | 'reservation_checkin' | 'takeaway_start' | 'takeaway_confirm',
    userId?: string
) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("restaurant_analytics_events")
            .insert({
                restaurant_id: restaurantId,
                event_type: eventType,
                user_id: userId
            });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error tracking event:", error);
        return { success: false, error: error.message };
    }
}

export async function getRestaurantSettingsAction(restaurantId: string) {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("restaurants")
            .select("*")
            .eq("id", restaurantId);

        if (error) throw error;

        if (!data || data.length === 0) {
            return { success: false, error: "Restaurante no encontrado en el sistema." };
        }

        return { success: true, data: data[0] };
    } catch (error: any) {
        console.error("Error fetching restaurant settings:", error);
        return { success: false, error: error.message };
    }
}

export async function updateRestaurantSettingsAction(restaurantId: string, updates: any) {
    try {
        console.log(`[Settings] Attempting update for restaurant ${restaurantId}`);
        const supabase = await createClient();
        
        // 1. Get User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("[Settings] Auth error or no user:", authError);
            throw new Error(`UNAUTHORIZED: ${authError?.message || 'No se encontró sesión activa.'} Por favor, cierre sesión e inicie nuevamente.`);
        }

        // 2. Get Profile (using admin client to ensure we find it regardless of RLS)
        const adminClient = createAdminClient();
        const { data: profile, error: profileError } = await adminClient
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            console.error("[Settings] Profile error:", profileError);
            throw new Error("FORBIDDEN: Perfil de usuario no encontrado.");
        }

        // 3. RBAC Check
        if (!isAdmin(profile)) {
            throw new Error("FORBIDDEN: No tiene permisos de administrador.");
        }

        // 4. Restaurant Binding Check (unless Super Admin)
        if (profile.restaurant_id && profile.restaurant_id !== restaurantId && !isSuperAdmin(profile)) {
            throw new Error("FORBIDDEN: Solo puede gestionar su propio restaurante.");
        }

        // 5. Perform Update
        const { error: updateError } = await adminClient
            .from("restaurants")
            .update(updates)
            .eq("id", restaurantId);

        if (updateError) {
            console.error("[Settings] Update error:", updateError);
            throw updateError;
        }

        console.log(`[Settings] Successfully updated restaurant ${restaurantId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating restaurant settings:", error);
        return { success: false, error: error.message };
    }
}

export async function getMenuItemsAction(restaurantId: string, role: string) {
    try {
        if (!canViewMenu(role)) {
            return { success: false, error: 'Access denied: insufficient permissions for menu management.' };
        }
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching menu items:", error);
        return { success: false, error: error.message };
    }
}

export async function updateMenuItemAction(itemId: string, updates: any) {
    try {
        // Validation: Need to get restaurant_id from item if not provided? 
        // For menu items, usually a general canViewMenu check + user binding check is needed
        await getAuthContext(null, canViewMenu);
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("menu_items")
            .update(updates)
            .eq("id", itemId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error updating menu item:", error);
        return { success: false, error: error.message };
    }
}

export async function addMenuItemAction(restaurantId: string, item: any) {
    try {
        await getAuthContext(restaurantId, canViewMenu);
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("menu_items")
            .insert({ ...item, restaurant_id: restaurantId });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error adding menu item:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteMenuItemAction(itemId: string) {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("menu_items")
            .delete()
            .eq("id", itemId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting menu item:", error);
        return { success: false, error: error.message };
    }
}

export async function getRestaurantUsersAction(restaurantId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name, role, display_name")
            .eq("restaurant_id", restaurantId);

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching restaurant users:", error);
        return { success: false, error: error.message };
    }
}

export async function createRestaurantUserAction(restaurantId: string, userData: any) {
    try {
        await getAuthContext(restaurantId, isAdmin);
        const { email, password, first_name, last_name, role } = userData;
        const supabaseAdmin = createAdminClient();

        // 1. Create in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name, last_name }
        });

        if (authError) throw authError;

        // 2. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email,
                first_name,
                last_name,
                role: role.toUpperCase(),
                restaurant_id: restaurantId
            });

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error creating restaurant user:", error);
        return { success: false, error: error.message };
    }
}

export async function updateRestaurantUserAction(userId: string, updateData: any) {
    try {
        const supabaseAdmin = createAdminClient();
        
        // 1. Update Auth if password provided
        if (updateData.password) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: updateData.password
            });
            if (authError) throw authError;
        }

        // 2. Update Profile
        const profileUpdate: any = {};
        if (updateData.first_name) profileUpdate.first_name = updateData.first_name;
        if (updateData.last_name) profileUpdate.last_name = updateData.last_name;
        if (updateData.role) profileUpdate.role = updateData.role.toUpperCase();

        if (Object.keys(profileUpdate).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdate)
                .eq('id', userId);
            
            if (profileError) throw profileError;
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating restaurant user:", error);
        return { success: false, error: error.message };
    }
}

export async function getPaymentHistoryAction(restaurantId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("restaurant_payments")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching payment history:", error);
        return { success: false, error: error.message };
    }
}

export async function getReservationsAction(restaurantId: string, role: string) {
    try {
        if (!canViewReservations(role)) {
            return { success: false, error: 'Access denied: insufficient permissions for reservations.' };
        }
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("date_time", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching reservations:", error);
        return { success: false, error: error.message };
    }
}

export async function updateReservationStatusAction(reservationId: string, status: string) {
    try {
        const supabase = await createClient();
        const supabaseAdmin = createAdminClient();

        // 1. Fetch reservation data with admin client to verify access and get details
        const { data: resData, error: fetchError } = await supabaseAdmin
            .from("reservations")
            .select("restaurant_id, organizer_id, date_time, party_size, unique_code")
            .eq("id", reservationId)
            .single();
        
        if (fetchError || !resData) {
            console.error("[UpdateReservation] Fetch error or missing:", fetchError, reservationId);
            throw new Error("Reservation not found");
        }

        // 2. Authorization check
        await getAuthContext(resData.restaurant_id, canViewReservations);

        // 3. Update the status
        const { data: res, error: updateError } = await supabaseAdmin
            .from("reservations")
            .update({ status })
            .eq("id", reservationId)
            .select("organizer_id, restaurant_id, date_time, party_size, unique_code")
            .single();

        if (updateError) throw updateError;

        // 2. If status is CONFIRMADA, send email
        if (status === 'CONFIRMADA' && res?.organizer_id) {
            // Fetch User Email and Restaurant Name
            const [userRes, restRes] = await Promise.all([
                supabase.from("profiles").select("email, first_name").eq("id", res.organizer_id).single(),
                supabase.from("restaurants").select("name, address, phone").eq("id", res.restaurant_id).single()
            ]);

            const userEmail = userRes.data?.email;
            const userName = userRes.data?.first_name || 'Comensal';
            const restaurantName = restRes.data?.name || 'El Restaurante';
            const reservationDate = new Date(res.date_time);

            if (userEmail) {
                const formattedDate = reservationDate.toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                await sendEmailAction({
                    to: userEmail,
                    subject: `🍽️ Reserva Confirmada - ${restaurantName}`,
                    text: `Hola ${userName},\n\nTu reserva en ${restaurantName} ha sido confirmada.\n\nFecha: ${formattedDate}\nPersonas: ${res.party_size}\nCódigo: ${res.unique_code}\n\n¡Te esperamos!\n\nAlmuerzo.cl`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #f1f5f9; border-radius: 24px; background: white; text-align: center;">
                            <div style="font-size: 52px; margin-bottom: 15px;">🍽️</div>
                            <h2 style="color: #10b981; font-weight: 900; margin-bottom: 5px; font-size: 28px;">¡Tu Mesa está Lista!</h2>
                            <p style="color: #64748b; font-weight: 500; margin-top: 0; font-size: 16px;">
                                Se ha confirmado tu reserva en <strong>${restaurantName}</strong>
                            </p>
                            
                            <div style="background: #f8fafc; padding: 25px; border-radius: 20px; margin: 30px 0; text-align: left;">
                                <div style="display: flex; flex-direction: column; gap: 15px;">
                                    <div style="margin-bottom: 15px;">
                                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 4px;">FECHA Y HORA</div>
                                        <div style="font-size: 18px; font-weight: 800; color: #1e293b; text-transform: capitalize;">${formattedDate}</div>
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 4px;">PLAZAS RESERVADAS</div>
                                        <div style="font-size: 18px; font-weight: 800; color: #1e293b;">${res.party_size} ${res.party_size === 1 ? 'Persona' : 'Personas'}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 4px;">CÓDIGO DE TICKET</div>
                                        <div style="font-size: 24px; font-weight: 900; color: #10b981; font-family: monospace;">${res.unique_code}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <p style="font-size: 14px; color: #64748b; line-height: 1.6; padding: 0 10px;">
                                Al llegar al restaurante, indica tu nombre o presenta este ticket digital. 
                                ¡Gracias por usar Almuerzo.cl para tus salidas!
                            </p>
                            
                            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9;">
                                <div style="font-size: 11px; font-weight: bold; color: #1e293b;">${restaurantName}</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${restRes.data?.address?.street || ''} ${restRes.data?.address?.number || ''}</div>
                                 <a href="https://ticket.almuerzo.cl" style="display: inline-block; margin-top: 20px; color: #10b981; font-weight: 900; text-decoration: none; font-size: 12px; letter-spacing: 0.5px;">ALMUERZO.CL</a>
                            </div>
                        </div>
                    `
                });
            }
        }

        // Also add database notification for the customer
        if (res?.organizer_id) {
            const { data: restData } = await supabase
                .from("restaurants")
                .select("name")
                .eq("id", res.restaurant_id)
                .single();
                
            const restaurantName = restData?.name || 'El Restaurante';
            const notificationTitle = `Reserva ${status.toLowerCase()}`;
            const notificationMsg = `Tu reserva en ${restaurantName} ahora está ${status.toLowerCase()}.`;
            
            await supabase
                .from("notifications")
                .insert({
                    user_id: res.organizer_id,
                    restaurant_id: res.restaurant_id,
                    title: notificationTitle,
                    message: notificationMsg,
                    type: 'RESERVATION',
                    related_id: reservationId,
                    is_read: false
                });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating reservation status:", error);
        return { success: false, error: error.message };
    }
}

export async function getTakeawayOrdersAction(restaurantId: string, role: string) {
    try {
        if (!canViewTakeaway(role)) {
            return { success: false, error: 'Access denied: insufficient permissions for takeaway.' };
        }
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("takeaway_orders")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching takeaway orders:", error);
        return { success: false, error: error.message };
    }
}

export async function updateTakeawayStatusAction(orderId: string, status: string, reason?: string) {
    try {
        const supabase = await createClient();
        const supabaseAdmin = createAdminClient();

        // 1. Fetch current order with admin client to get restaurant_id and current state
        const { data: currentOrder, error: fetchError } = await supabaseAdmin
            .from("takeaway_orders")
            .select("*")
            .eq("id", orderId)
            .single();
            
        if (fetchError || !currentOrder) {
            console.error("[UpdateStatus] Fetch error or order missing:", fetchError, orderId);
            throw new Error("Order not found");
        }

        // 2. Authorization check
        await getAuthContext(currentOrder.restaurant_id, canViewTakeaway);

        const items = typeof currentOrder.items === 'string' ? JSON.parse(currentOrder.items) : (currentOrder.items || []);

        // 2. STRICT LIFECYCLE VALIDATION
        const currentStatus = currentOrder.status;
        
        // Rule: Only PENDIENTE can become APROBADA or RECHAZADA
        if ((status === 'APROBADA' || status === 'RECHAZADA') && currentStatus !== 'PENDIENTE' && currentStatus !== 'CREADA') {
            throw new Error(`Invalid transition: Cannot move from ${currentStatus} to ${status}`);
        }
        
        // Rule: Only APROBADA can become PREPARANDO
        if (status === 'PREPARANDO' && currentStatus !== 'APROBADA') {
            throw new Error(`Invalid transition: Only APROBADA orders can start preparation.`);
        }
        
        // Rule: Only PREPARANDO can become LISTO
        if (status === 'LISTO' && currentStatus !== 'PREPARANDO') {
            throw new Error(`Invalid transition: Only PREPARANDO orders can be marked as LISTO.`);
        }

        // Rule: NO SHOW can only happen after LISTO
        if (status === 'NO SHOW' && (currentStatus !== 'LISTO' && currentStatus !== 'ENTREGADO')) {
             throw new Error("Invalid transition: Only LISTO or ENTREGADO orders can be marked as NO SHOW.");
        }

        // Rule: Allow ENTREGADO from LISTO or PREPARANDO or APROBADA (to rescue stuck orders)
        if (status === 'ENTREGADO' && !['LISTO', 'PREPARANDO', 'APROBADA'].includes(currentStatus)) {
            throw new Error(`Invalid transition: Cannot deliver order that is ${currentStatus}`);
        }

        // 2.5 INVENTORY CONTROL: Validate and Deduct stock on APROBADA
        if (status === 'APROBADA') {
            // First check if all items have enough stock (if managed)
            for (const item of items) {
                const itemId = item.id || item.menu_item_id;
                if (itemId) {
                    const { data: menuItem } = await supabase
                        .from('menu_items')
                        .select('name, stock_managed, current_stock')
                        .eq('id', itemId)
                        .single();
                        
                    if (menuItem?.stock_managed) {
                        const quantity = Number(item.quantity) || 1;
                        if ((menuItem.current_stock || 0) < quantity) {
                            throw new Error(`SIN STOCK: ${menuItem.name} (Quedan: ${menuItem.current_stock})`);
                        }
                    }
                }
            }
            // Note: Deduction is now handled by the database trigger tr_handle_takeaway_inventory 
            // defined in V5_ARCHITECTURE_FINAL.sql to ensure data integrity.
        }

        // 3. Update the order
        // Use metadata to store timestamps and reasons to be resilient to schema changes
        const existingMetadata = typeof currentOrder.metadata === 'string' 
            ? JSON.parse(currentOrder.metadata) 
            : (currentOrder.metadata || {});

        const updatedMetadata = { ...existingMetadata };
        
        if (reason && status === 'RECHAZADA') {
            updatedMetadata.rejection_reason = reason;
        }
        
        if (status === 'LISTO') updatedMetadata.ready_at = new Date().toISOString();
        if (status === 'APROBADA') updatedMetadata.approved_at = new Date().toISOString();

        const updatePayload: any = { 
            status,
            metadata: updatedMetadata
        };

        const { data: order, error: updateError } = await supabaseAdmin
            .from("takeaway_orders")
            .update(updatePayload)
            .eq("id", orderId)
            .select("user_id, restaurant_id, customer_name, total_amount, metadata")
            .single();

        if (updateError) {
            console.error("Supabase Update Error:", updateError);
            throw updateError;
        }

        // 4. NOTIFICATIONS (Email & PWA)
        if (order?.user_id) {
            const [userRes, restRes] = await Promise.all([
                supabase.from("profiles").select("email, first_name, phone_number").eq("id", order.user_id).single(),
                supabase.from("restaurants").select("name").eq("id", order.restaurant_id).single()
            ]);

            const userEmail = userRes.data?.email;
            const userPhone = userRes.data?.phone_number;
            const userName = userRes.data?.first_name || order.customer_name || 'Cliente';
            const restaurantName = restRes.data?.name || 'El Restaurante';

            // PWA Notification logic
            const statusMessages: any = {
                'APROBADA': '¡Tu pedido ha sido aprobado! 🍱',
                'PREPARANDO': 'Tu pedido está en cocina 👨‍🍳',
                'LISTO': '¡Pedido listo para retirar! 🍱 Preséntate en el local.',
                'RECHAZADA': `Lo sentimos, el pedido fue rechazado. ${reason ? `Motivo: ${reason}` : ''} ❌`,
                'NO SHOW': 'Tu pedido no fue retirado a tiempo. ⚠️'
            };

            if (statusMessages[status]) {
                await supabase.from('notifications').insert({
                    user_id: order.user_id,
                    restaurant_id: order.restaurant_id,
                    title: restaurantName,
                    message: statusMessages[status],
                    type: 'TAKEAWAY',
                    related_id: orderId,
                    is_read: false
                });
            }

            // EMAIL on LISTO
            if (status === 'LISTO') {
                if (userEmail) {
                    await sendEmailAction({
                        to: userEmail,
                        subject: `🍱 ¡Tu pedido en ${restaurantName} está listo!`,
                        text: `Hola ${userName},\n\nTu pedido en ${restaurantName} ya está listo para ser retirado.\n\n¡Te esperamos!\n\nAlmuerzo.cl`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #f1f5f9; border-radius: 24px; background: white; text-align: center;">
                                <div style="font-size: 52px; margin-bottom: 15px;">🍱</div>
                                <h2 style="color: #6366f1; font-weight: 900; margin-bottom: 5px; font-size: 28px;">¡Listo para Retirar!</h2>
                                <p style="color: #64748b; font-weight: 500; margin-top: 0; font-size: 16px;">
                                    Ya puedes pasar por <strong>${restaurantName}</strong> a buscar tu orden.
                                </p>
                                
                                <div style="background: #f8fafc; padding: 25px; border-radius: 20px; margin: 30px 0; text-align: left;">
                                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 4px;">TICKET ID</div>
                                    <div style="font-size: 20px; font-weight: 900; color: #1e293b; font-family: monospace;">#${orderId.substring(0, 8).toUpperCase()}</div>
                                </div>
                                
                                <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                                    Muestra este mensaje o indica tu nombre al llegar al restaurante.
                                </p>
                            </div>
                        `
                    });
                }
                
                // SMS (WhatsApp) on LISTO
                if (userPhone) {
                    try {
                        await supabase.functions.invoke('send-sms', {
                            body: {
                                to: userPhone,
                                message: `🍱 ¡Tu pedido en ${restaurantName} ya está LISTO! Preséntate ahora en el local para retirarlo. Ticket: #${orderId.substring(0, 8).toUpperCase()}`
                            }
                        });
                    } catch (e) {
                        console.error('Error enviando SMS de confirmación', e);
                    }
                }
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating takeaway status:", error);
        return { success: false, error: error.message };
    }
}
export async function sendDailyMenuAction(restaurantId: string) {
    try {
        const supabase = await createClient();

        // 1. Get Daily Menu Items
        const { data: items, error: itemsError } = await supabase
            .from("menu_items")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .eq("is_menu_del_dia", true);

        if (itemsError) throw itemsError;
        if (!items || items.length === 0) {
            return { success: false, error: "No hay platos marcados como menú del día." };
        }

        // 2. Get Restaurant Info
        const { data: restaurant, error: restError } = await supabase
            .from("restaurants")
            .select("name")
            .eq("id", restaurantId)
            .single();

        if (restError) throw restError;

        // 3. Get Subscribers
        const { data: subscribers, error: subsError } = await supabase
            .from("profiles")
            .select("email, first_name")
            .contains("subscribed_daily_menu_ids", [restaurantId]);

        if (subsError) throw subsError;
        if (!subscribers || subscribers.length === 0) {
            return { success: false, error: "No tienes suscriptores registrados para el menú del día." };
        }

        // 4. Send Emails
        const itemsHtml = items.map(item => `
            <div style="padding: 15px; border-bottom: 1px solid #f1f5f9;">
                <h3 style="margin: 0; color: #1e293b; font-size: 16px;">${item.name}</h3>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">$${item.price.toLocaleString('es-CL')}</p>
            </div>
        `).join('');

        const sendPromises = subscribers.map(sub => 
            sendEmailAction({
                to: sub.email,
                subject: `🍽️ Menú del Día - ${restaurant.name}`,
                text: `Hola ${sub.first_name || 'Comensal'},\n\nAquí tienes el menú de hoy en ${restaurant.name}:\n\n${items.map(i => `- ${i.name}: $${i.price}`).join('\n')}\n\n¡Te esperamos!`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; border-radius: 24px; overflow: hidden; background: white;">
                        <div style="background: #1e293b; color: white; padding: 40px 20px; text-align: center;">
                            <span style="font-size: 40px;">🍽️</span>
                            <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">¡Menú de Hoy!</h1>
                            <p style="margin: 5px 0 0 0; opacity: 0.7; font-weight: 500;">${restaurant.name}</p>
                        </div>
                        <div style="padding: 20px;">
                            ${itemsHtml}
                        </div>
                        <div style="padding: 30px; text-align: center; background: #f8fafc;">
                            <p style="margin-bottom: 20px; font-size: 14px; color: #64748b; font-weight: 500;">¿Te tienta algo? Haz tu reserva o pide para retirar.</p>
                            <a href="https://ticket2.almuerzo.cl/restaurant/${restaurantId}" style="background: #10b981; color: white; padding: 14px 28px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                                Ver Detalles en Almuerzo.cl
                            </a>
                        </div>
                    </div>
                `
            })
        );

        await Promise.all(sendPromises);

        // 5. Update last sent timestamp
        await supabase
            .from("restaurants")
            .update({ last_daily_menu_sent_at: new Date().toISOString() })
            .eq("id", restaurantId);

        return { success: true, count: subscribers.length };
    } catch (error: any) {
        console.error("Error sending daily menu:", error);
        return { success: false, error: error.message };
    }
}
