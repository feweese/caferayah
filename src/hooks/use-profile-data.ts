"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface ProfileData {
  phoneNumber: string | null;
  address: string | null;
}

export function useProfileData() {
  const { data: session, update } = useSession();
  const [profileData, setProfileData] = useState<ProfileData>({
    phoneNumber: null,
    address: null,
  });

  // Load from localStorage on mount and when session changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Always prioritize session data over localStorage
        // This ensures we're showing the most up-to-date data from the database
        if (session?.user) {
          const newData = {
            phoneNumber: session.user.phoneNumber || null,
            address: session.user.address || null,
          };
          setProfileData(newData);
          localStorage.setItem("userProfileData", JSON.stringify(newData));
        } 
        // Fall back to localStorage only if no session data available
        else {
          const savedData = localStorage.getItem("userProfileData");
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            setProfileData(parsedData);
          }
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    }
  }, [session]);

  // Function to update profile data both in localStorage and state
  const updateProfileData = (data: Partial<ProfileData>) => {
    try {
      const newData = {
        ...profileData,
        ...data,
      };
      localStorage.setItem("userProfileData", JSON.stringify(newData));
      setProfileData(newData);
    } catch (error) {
      console.error("Error saving profile data:", error);
    }
  };

  return {
    profileData,
    updateProfileData,
  };
} 