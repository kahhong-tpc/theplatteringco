// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wixClient } from "@/lib/wixClient";
import {
  MemberProfileData,
  fetchCurrentMemberProfile,
  logoutMember,
} from "@/lib/wix-auth";

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  member: MemberProfileData | null;
  refreshMember: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  loading: true,
  member: null,
  refreshMember: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [member, setMember] = useState<MemberProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshMember = useCallback(async () => {
        setLoading(true);
        try {
            if (wixClient.auth.loggedIn()) {
            const profile = await fetchCurrentMemberProfile();
            setMember(profile);
            } else {
            setMember(null);
            }
        } catch (err) {
            console.error("Failed to fetch Wix member profile:", err);
            setMember(null);
        } finally {
            setLoading(false);
        }
    }, []);

  useEffect(() => {
    refreshMember();
  }, [refreshMember]);

  const logout = async () => {
    await logoutMember();
    setMember(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: Boolean(member),
        loading,
        member,
        refreshMember,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);