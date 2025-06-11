"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { logout, checkUserAuth } from "@/store/features/authSlice";

export default function Navbar() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isInitialized, userName } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    setIsMounted(true);
    // Sayfa yüklendiğinde token kontrolü yap
    dispatch(checkUserAuth());
  }, [dispatch]);

  const handleLogout = () => {
    // İlk olarak removeAuthToken fonksiyonunu import et
    import("@/utils/auth").then(({ removeAuthToken }) => {
      // LocalStorage'dan token'ı temizle
      removeAuthToken();
      // Redux state'i güncelle
      dispatch(logout());
      // Kullanıcıyı ana sayfaya yönlendir
      router.push("/");
      // Profil menüsünü kapat
      setIsProfileOpen(false);
    });
  };

  // İlk render'da boş navbar döndür - bu hidrasyon hatalarını önler
  if (!isMounted || !isInitialized) {
    return (
      <nav
        className='bg-black p-4 shadow-lg fixed top-0 left-0 right-0 z-50'
        suppressHydrationWarning
      ></nav>
    );
  }

  const links = [
    { href: "/", label: "Ana Sayfa" },
    {
      href: isAuthenticated ? "/my-movies" : "/users/login",
      label: "Filmlerim",
    },
    {
      href: isAuthenticated ? "/movies" : "/users/login",
      label: "Filmler",
    },
    {
      href: isAuthenticated ? "/recommended" : "/users/login",
      label: "Önerilen Filmler",
    },
  ];

  return (
    <nav
      className='bg-black p-4 shadow-lg fixed top-0 left-0 right-0 z-50'
      suppressHydrationWarning
    >
      <div className='container mx-auto flex items-center justify-between'>
        <div className='flex items-center space-x-8'>
          <Link
            href={isAuthenticated ? "/movies" : "/"}
            className='text-purple-500 text-2xl font-bold'
          >
            Movie App
          </Link>

          {isAuthenticated && (
            <div className='hidden md:flex space-x-6'>
              {links
                .filter((link) => link.href !== "/")
                .map((link, index) => (
                  <Link
                    key={index}
                    href={link.href}
                    className='text-white hover:text-purple-500 transition'
                  >
                    {link.label}
                  </Link>
                ))}
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className='relative'>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className='flex items-center space-x-2 text-white hover:text-purple-500 transition'
              suppressHydrationWarning
            >
              <span>Hoş geldin, {userName || "Misafir"}</span>
              <svg
                className={`w-4 h-4 transform transition-transform ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </button>

            {isProfileOpen && (
              <div className='absolute right-0 mt-2 w-48 bg-black rounded-md shadow-lg py-1 z-50 border border-gray-700'>
                <Link
                  href='/users/profile'
                  className='block px-4 py-2 text-white hover:bg-purple-500 transition'
                  onClick={() => setIsProfileOpen(false)}
                >
                  Profil Ayarları
                </Link>
                <button
                  onClick={handleLogout}
                  className='block w-full text-left px-4 py-2 text-white hover:bg-purple-500 transition'
                  suppressHydrationWarning
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className='md:hidden mt-4 space-y-2'>
          {links
            .filter((link) => link.href !== "/")
            .map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className='block text-white hover:text-purple-500 transition'
              >
                {link.label}
              </Link>
            ))}
        </div>
      )}
    </nav>
  );
}
