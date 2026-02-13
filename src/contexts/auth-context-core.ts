import { createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = "super_admin" | "admin" | "viewer" | null;

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole;
    fullName: string | null;
    approved: boolean | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

// Singleton context to survive HMR better if kept in a separate file
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
