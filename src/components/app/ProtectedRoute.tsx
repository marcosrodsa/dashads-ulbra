import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context-core";
import { Loader2 } from "lucide-react";
import { hasAccess } from "@/lib/permissions";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, role, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-svh w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check capability-based access
    if (!hasAccess(role, location.pathname)) {
        console.warn(`Access denied for role ${role} to path ${location.pathname}`);
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
