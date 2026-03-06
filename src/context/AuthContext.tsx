"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
    user: any | null;
    profile: any | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let mounted = true;

        async function getInitialSession() {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (!mounted) return;

            if (error || !session?.user) {
                setLoading(false);
                if (pathname !== "/login") {
                    router.push("/login");
                }
                return;
            }

            setUser(session.user);
            await fetchProfile(session.user.id);
        }

        getInitialSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    if (pathname !== "/login") {
                        router.push("/login");
                    }
                }
            }
        );

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error("Error loading profile:", error);
            }

            setProfile(data);
        } catch (error) {
            console.error("Unexpected error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            // Redirigir y forzar limpieza total del estado del cliente
            window.location.replace("/login");
        } catch (error) {
            console.error("Error signing out:", error);
            window.location.replace("/login");
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
