"use server";

import { createClient } from "@/utils/supabase/server";
import { sendEmailAction } from "./email-actions";

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
        const supabase = await createClient();
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

        const publicTicketUrl = `https://v5.almuerzo.cl/ticket/${code}`;

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
                                <a href="https://v5.almuerzo.cl/onboarding" style="background: white; color: #10b981; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
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

export async function trackAnalyticsEventAction(
    restaurantId: string,
    eventType: 'view_home' | 'view_menu' | 'reservation_start' | 'takeaway_start',
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
        const supabase = await createClient();
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
        const supabase = await createClient();
        const { error } = await supabase
            .from("restaurants")
            .update(updates)
            .eq("id", restaurantId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Error updating restaurant settings:", error);
        return { success: false, error: error.message };
    }
}

export async function getMenuItemsAction(restaurantId: string, role: string) {
    try {
        // Verify role access
        const allowedRoles = ['ADMIN', 'operations_manager', 'menu_manager'];
        if (!allowedRoles.includes(role)) {
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
        const supabase = await createClient();
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
        const supabase = await createClient();
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
        const supabase = await createClient();
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
        // Verify role access
        const allowedRoles = ['ADMIN', 'operations_manager', 'reservation_manager'];
        if (!allowedRoles.includes(role)) {
            return { success: false, error: 'Access denied: insufficient permissions for reservations.' };
        }
        const supabase = await createClient();
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

        // 1. Update the status
        const { data: res, error: updateError } = await supabase
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
                                <a href="https://v5.almuerzo.cl" style="display: inline-block; margin-top: 20px; color: #10b981; font-weight: 900; text-decoration: none; font-size: 12px; letter-spacing: 0.5px;">ALMUERZO.CL</a>
                            </div>
                        </div>
                    `
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating reservation status:", error);
        return { success: false, error: error.message };
    }
}

export async function getTakeawayOrdersAction(restaurantId: string, role: string) {
    try {
        // Verify role access
        const allowedRoles = ['ADMIN', 'operations_manager', 'takeaway_manager'];
        if (!allowedRoles.includes(role)) {
            return { success: false, error: 'Access denied: insufficient permissions for takeaway.' };
        }
        const supabase = await createClient();
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

export async function updateTakeawayStatusAction(orderId: string, status: string) {
    try {
        const supabase = await createClient();

        // 1. Update the status
        const { data: order, error: updateError } = await supabase
            .from("takeaway_orders")
            .update({ status })
            .eq("id", orderId)
            .select("user_id, restaurant_id, customer_name, total_amount")
            .single();

        if (updateError) throw updateError;

        // 2. If status is LISTO, send email
        if (status === 'LISTO' && order?.user_id) {
            // Fetch User Email and Restaurant Name
            const [userRes, restRes] = await Promise.all([
                supabase.from("profiles").select("email, first_name").eq("id", order.user_id).single(),
                supabase.from("restaurants").select("name").eq("id", order.restaurant_id).single()
            ]);

            const userEmail = userRes.data?.email;
            const userName = userRes.data?.first_name || order.customer_name || 'Cliente';
            const restaurantName = restRes.data?.name || 'El Restaurante';

            if (userEmail) {
                await sendEmailAction({
                    to: userEmail,
                    subject: `🍱 ¡Tu pedido en ${restaurantName} está listo!`,
                    text: `Hola ${userName},\n\nTe informamos que tu pedido por $${order.total_amount.toLocaleString('es-CL')} ya está listo para ser retirado en ${restaurantName}.\n\n¡Te esperamos!\n\nAlmuerzo.cl`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px; text-align: center;">
                            <div style="font-size: 50px; margin-bottom: 10px;">🍱</div>
                            <h2 style="color: #1e293b; font-weight: 900; margin-bottom: 5px;">¡Vente por tu Pedido!</h2>
                            <p style="color: #64748b; font-weight: 500; margin-top: 0;">Tu orden en <strong>${restaurantName}</strong> ya está lista.</p>
                            
                            <div style="background: #f8fafc; padding: 20px; border-radius: 15px; margin: 25px 0;">
                                <div style="font-size: 12px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px;">Total a Pagar</div>
                                <div style="font-size: 32px; font-weight: 900; color: #1e293b;">$${order.total_amount.toLocaleString('es-CL')}</div>
                            </div>
                            
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                                Puedes pasar por el local a retirar tu comida en este momento. <br/>
                                Presenta tu nombre o el ID de pedido: <strong>#${orderId.substring(0, 8).toUpperCase()}</strong>
                            </p>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                                <p style="font-size: 12px; color: #94a3b8;">Gracias por preferir Almuerzo.cl</p>
                            </div>
                        </div>
                    `
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating takeaway status:", error);
        return { success: false, error: error.message };
    }
}
