import React, { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { AuthContext, type UserRole, type AuthContextType } from "./auth-context-core";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [fullName, setFullName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const client = getSupabaseClient();

    const isFetchingProfile = React.useRef(false);

    const fetchProfile = async (userId: string) => {
        if (!client || isFetchingProfile.current) return;
        isFetchingProfile.current = true;

        try {
            const { data, error } = await client
                .from("profiles")
                .select("role, full_name")
                .eq("id", userId)
                .limit(1);

            const profile = data?.[0];

            if (error) {
                // Silencie erros de 404 e AbortError
                // Convertendo para string seguro para verificar conteúdo
                const errorString = JSON.stringify(error).toLowerCase();
                const isAbort = error.message?.toLowerCase().includes('abort') ||
                    error.details?.toLowerCase().includes('abort') ||
                    errorString.includes('abort');

                if (error.code !== 'PGRST116' && !isAbort) {
                    console.error("Error fetching profile:", error);
                }
            } else {
                console.log("AuthProvider: Profile found:", profile);
                setRole(profile?.role as UserRole || "viewer");
                if (profile?.full_name) {
                    console.log("AuthProvider: Setting full name:", profile.full_name);
                    setFullName(profile.full_name);
                }
            }
        } catch (err: any) {
            const errString = String(err).toLowerCase();
            if (err.name === 'AbortError' || errString.includes('abort') || err.message?.toLowerCase().includes('abort')) {
                return;
            }
            console.error("Profile fetch exception:", err);
        } finally {
            isFetchingProfile.current = false;
        }
    };

    useEffect(() => {
        if (!client) {
            setIsLoading(false);
            return;
        }

        // Check for session immediately
        client.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                console.log("AuthProvider: Initial session found", session.user.id);
                setSession(session);
                setUser(session.user);
                if (session.user.user_metadata?.full_name) {
                    setFullName(session.user.user_metadata.full_name);
                }
                fetchProfile(session.user.id);
            }
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);

            setSession(session);
            const newUser = session?.user ?? null;
            setUser(newUser);

            if (session?.user) {
                if (session.user.user_metadata?.full_name) {
                    setFullName(session.user.user_metadata.full_name);
                }

                if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                    fetchProfile(session.user.id);
                }
            } else {
                setRole(null);
                setFullName(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            setIsLoading(true);
            if (client) {
                await client.auth.signOut();
                console.log("SignOut completed via Supabase");
            }
        } catch (error: any) {
            const errString = String(error).toLowerCase();
            if (error.name === 'AbortError' || errString.includes('abort') || error.message?.toLowerCase().includes('abort')) {
                return;
            }
            console.error("Error signing out:", error);
        } finally {
            // Force clear state to ensure UI updates immediately
            setUser(null);
            setSession(null);
            setRole(null);
            setFullName(null);
            setIsLoading(false);
            // Optional: Clear local storage if using it for persistence beyond SDK
            localStorage.removeItem('supabase.auth.token');
        }
    };

    const refreshProfile = async () => {
        if (user) {
            console.log("Refreshing profile for:", user.id);
            await fetchProfile(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, role, fullName, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

