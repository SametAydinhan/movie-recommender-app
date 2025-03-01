"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { logout, checkAuth } from "@/store/features/authSlice";

export default function Navbar() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Sayfa yüklendiğinde token kontrolü yap
    const token = localStorage.getItem("token");
    if (token) {
      dispatch(checkAuth());
    }
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("token");
    router.push("/");
    setIsProfileOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <nav className='bg-black p-4 shadow-lg'>
        <div className='container mx-auto'>
          <Link href='/' className='text-purple-500 text-2xl font-bold'>
            Movie App
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className='bg-black p-4 shadow-lg'>
      <div className='container mx-auto flex items-center justify-between'>
        <div className='flex items-center space-x-8'>
          <Link href='/movies' className='text-purple-500 text-2xl font-bold'>
            Movie App
          </Link>

          <div className='hidden md:flex space-x-6'>
            <Link
              href='/my-movies'
              className='text-white hover:text-purple-500 transition'
            >
              Film Listem
            </Link>
            <Link
              href='/add-movie'
              className='text-white hover:text-purple-500 transition'
            >
              Film Ekle
            </Link>
            <Link
              href='/movies'
              className='text-white hover:text-purple-500 transition'
            >
              Filmler
            </Link>
          </div>
        </div>

        <div className='relative'>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className='flex items-center space-x-2 text-white hover:text-purple-500 transition'
          >
            <span>Profilim</span>
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
                href='/profile'
                className='block px-4 py-2 text-white hover:bg-purple-500 transition'
                onClick={() => setIsProfileOpen(false)}
              >
                Profil Ayarları
              </Link>
              <button
                onClick={handleLogout}
                className='block w-full text-left px-4 py-2 text-white hover:bg-purple-500 transition'
              >
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobil Menü */}
      <div className='md:hidden mt-4 space-y-2'>
        <Link
          href='/my-movies'
          className='block text-white hover:text-purple-500 transition'
        >
          Film Listem
        </Link>
        <Link
          href='/add-movie'
          className='block text-white hover:text-purple-500 transition'
        >
          Film Ekle
        </Link>
        <Link
          href='/movies'
          className='block text-white hover:text-purple-500 transition'
        >
          Filmler
        </Link>
      </div>
    </nav>
  );
}
