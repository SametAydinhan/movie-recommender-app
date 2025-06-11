"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/utils/auth";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Kullanıcının oturumunu kontrol et
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          // Token yoksa login sayfasına yönlendir
          router.push("/users/login");
          return;
        }
        setIsChecking(false);
      } catch (error) {
        console.error("Auth hatası:", error);
        router.push("/users/login");
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  return <div className='pt-16'>{children}</div>;
}
