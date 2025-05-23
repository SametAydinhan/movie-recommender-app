"use client";

import Link from "next/link";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sayfa tamamen yüklendiğinde ve auth durumu hazır olduğunda
    if (isInitialized) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && isInitialized) {
      router.push("/movies");
    }
  }, [isAuthenticated, router, isLoading, isInitialized]);

  // İlk yükleme sırasında veya auth durumu henüz hazır değilse bir yükleme göstergesi göster
  if (isLoading || !isInitialized) {
    return (
      <div className='h-[calc(100vh-64px)] flex items-center justify-center bg-black'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500'></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Yönlendirme yapılırken boş sayfa göster
  }

  return (
    <div
      className='h-[calc(100vh-64px)] bg-black relative flex flex-col items-center justify-center'
      suppressHydrationWarning
    >
      {/* Sağ alt köşedeki resim */}
      <div className='absolute bottom-0 right-0 w-[400px] h-[400px] hidden xl:block'>
        <Image
          src='/dashboard-preview.svg'
          alt='Movie illustration'
          width={400}
          height={400}
          priority
        />
      </div>

      {/* Ortadaki içerik */}
      <div className='flex flex-col items-center justify-center pb-16'>
        <h1 className='text-white text-4xl font-bold mb-6'>Movie App</h1>
        <div className='space-y-3 text-gray-300 text-lg mb-8 flex flex-col w-[400px]'>
          <p>İzlediğin filmleri kaydet.</p>
          <p>İzlemek istediklerini listele.</p>
          <p>Arkadaşlarınla yorumlarını paylaş.</p>
        </div>
        <div className='flex gap-4 justify-center w-[400px]'>
          <Link
            href='/users/register'
            className='button-base bg-white text-black hover-scale hover:bg-gray-100 w-full max-w-[200px] text-center text-lg font-normal pt-2'
          >
            Movie App'e Katıl
          </Link>
          <Link
            href='/users/login'
            className='button-base bg-purple-600 hover-scale hover:bg-purple-700 w-full max-w-[200px] text-center text-lg font-normal pt-2'
          >
            Giriş Yap
          </Link>
        </div>
      </div>

      {/* Sol taraftaki resim */}
      <div className='absolute top-0 left-0 w-[400px] h-[400px] hidden xl:block'>
        <Image
          src='/watching-movie.svg'
          alt='Movie illustration'
          width={400}
          height={400}
          priority
        />
      </div>
    </div>
  );
}
