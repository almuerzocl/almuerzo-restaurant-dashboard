"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { Bell, ShoppingBag, Calendar } from 'lucide-react';
import { BlockingNotification } from '@/components/dashboard/BlockingNotification';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    metadata: any;
    is_read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [criticalNotification, setCriticalNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'loading' | 'error' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    useEffect(() => {
        if (!profile?.id) return;

        // Initial fetch
        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        fetchNotifications();

        // Realtime subscription
        const channel = supabase
            .channel(`user-notifications-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${profile.id}`
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications(prev => [newNotification, ...prev].slice(0, 20));
                    setUnreadCount(prev => prev + 1);

                    // Show a toast
                    toast.info(newNotification.title, {
                        description: newNotification.message,
                        icon: <Bell className="w-4 h-4" />,
                        duration: 5000,
                    });

                    // If critical (new order or reservation), show blocker
                    if (['order', 'Takeaway', 'TAKEAWAY', 'reservation', 'Reservation', 'RESERVATION'].includes(newNotification.type)) {
                        setCriticalNotification({
                            isOpen: true,
                            title: newNotification.title,
                            message: newNotification.message,
                            type: 'success'
                        });
                    }

                    // Sound effect
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(() => { });
                    } catch (e) { }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (!profile?.id) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', profile.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}
            <BlockingNotification
                isOpen={criticalNotification.isOpen}
                title={criticalNotification.title}
                message={criticalNotification.message}
                type={criticalNotification.type}
                onClose={() => setCriticalNotification(prev => ({ ...prev, isOpen: false }))}
            />
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
