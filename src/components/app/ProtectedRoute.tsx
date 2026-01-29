import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context-core";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { user, role, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        console.log("ProtectedRoute: isLoading is true");
        return (
            <div className="min-h-svh w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    console.log("ProtectedRoute: State", { hasUser: !!user, role });

    if (!user) {
        console.log("ProtectedRoute: No user, redirecting to /login from", location.pathname);
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && role !== "admin") {
        // User is logged in but not an admin
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
