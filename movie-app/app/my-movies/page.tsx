"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaStarHalf, FaRegStar } from "react-icons/fa";
import { getAuthToken } from "@/utils/auth";
import { useRouter } from "next/navigation";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  runtime: number;
  overview: string;
  genres: string[] | string;
  watched_at?: string;
}

export default function MyMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // Kullanıcının oturum durumunu kontrol et
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      if (token) {
        setIsLoggedIn(true);
        fetchUserMovies(token);
      } else {
        setIsLoggedIn(false);
        setLoading(false);
        // Giriş yapmayan kullanıcıları login sayfasına yönlendir
        router.push("/users/login");
      }
    };

    checkAuth();
  }, [router]);

  // Kullanıcının izlediği filmleri getir
  const fetchUserMovies = async (token: string) => {
    try {
      setLoading(true);
      // Backend'den kullanıcı bilgilerini al
      const userResponse = await fetch("http://localhost:3001/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Kullanıcı bilgileri alınamadı");
      }

      const userData = await userResponse.json();
      console.log("Kullanıcı bilgileri:", userData);

      const userId = userData.user?.id;

      if (!userId) {
        throw new Error("Kullanıcı ID'si bulunamadı");
      }

      try {
        // Önce backend API'yi dene
        // Kullanıcının izlediği filmleri getir
        const response = await fetch(
          `http://localhost:3001/api/users/${userId}/watched?page=1&limit=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API yanıt hatası:", response.status, errorText);
          // Backend API hatası - alternatif yönteme geç
          throw new Error(
            `Backend API hatası: ${response.status} - ${
              errorText || "Bilinmeyen hata"
            }`
          );
        }

        const data = await response.json();
        console.log("API yanıtı:", data);

        // API yanıtı boş mu kontrol et
        if (
          data.movies &&
          data.movies.length === 0 &&
          data.pagination &&
          data.pagination.total > 0
        ) {
          console.warn(
            "API yanıtında toplam film sayısı",
            data.pagination.total,
            "olduğu halde filmler boş dönüyor. SQL sorgusu ile alternatif çözüm denenecek."
          );
          throw new Error("Backend API veri tutarsızlığı");
        }

        // Geçerli film verilerini filtrele
        const validMovies = (data.movies || []).filter(
          (movie: any) => movie && movie.id && movie.title
        );

        setMovies(validMovies);
      } catch (apiError) {
        console.warn(
          "Backend API hatası, alternatif yöntem kullanılıyor:",
          apiError
        );

        // Alternatif yöntem: tüm filmlerden izlenenler bilgisini al
        // Bu sadece geçici bir çözüm, backend düzeltilince kaldırılabilir
        const allMoviesResponse = await fetch(
          "http://localhost:3001/api/movies?page=1&limit=50"
        );

        if (!allMoviesResponse.ok) {
          throw new Error("Filmler yüklenemedi");
        }

        const allMoviesData = await allMoviesResponse.json();
        let allMovies = allMoviesData.movies || [];

        // LocalStorage'dan izlenen film ID'lerini al (eğer varsa)
        const watchedMovieIdsStr = localStorage.getItem("watchedMovies");
        let watchedMovieIds: number[] = [];

        try {
          if (watchedMovieIdsStr) {
            watchedMovieIds = JSON.parse(watchedMovieIdsStr);
          }
        } catch (e) {
          console.error("localStorage izlenen filmler ayrıştırma hatası:", e);
        }

        // Eğer localStorage'da izlenen film yoksa örnek 5 film göster
        if (watchedMovieIds.length === 0) {
          // İlk 5 filmi seç (geliştirme/test için)
          watchedMovieIds = allMovies.slice(0, 5).map((m: any) => m.id);
        }

        // İzlenen film ID'lerine göre filmleri filtreleme
        const watchedMovies = allMovies.filter((movie: any) =>
          watchedMovieIds.includes(movie.id)
        );

        console.log("Alternatif yöntem izlenen filmler:", watchedMovies);
        setMovies(watchedMovies);
      }
    } catch (error: any) {
      console.error("Filmler alınırken hata:", error);
      setError(error.message || "Filmler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // Yıldız değerlendirmesi gösterimi
  const getStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    // Dolu yıldızlar
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full_${i}`} className='text-yellow-400' />);
    }

    // Yarım yıldız
    if (halfStar) {
      stars.push(<FaStarHalf key='half' className='text-yellow-400' />);
    }

    // Boş yıldızlar
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty_${i}`} className='text-yellow-400' />);
    }

    return stars;
  };

  // Tarih formatı
  const formatDate = (dateString: string): string => {
    if (!dateString) return "Tarih bilgisi yok";

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return "Geçersiz tarih";
    }
  };

  // Film türlerini işle
  const parseGenres = (genresData: string[] | string): string => {
    if (!genresData) return "Tür bilgisi yok";

    if (Array.isArray(genresData)) {
      return genresData.join(", ");
    }

    if (typeof genresData === "string") {
      try {
        const parsed = JSON.parse(genresData.replace(/'/g, '"'));
        return Array.isArray(parsed)
          ? parsed.map((g: any) => g.name || g).join(", ")
          : String(genresData);
      } catch (e) {
        return String(genresData);
      }
    }

    return "Tür bilgisi yok";
  };

  // Yükleniyor gösterimi
  if (loading) {
    return (
      <div className='container mx-auto py-10 px-4 min-h-screen'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          İzlediğim Filmler
        </h1>
        <div className='flex justify-center items-center h-40'>
          <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900'></div>
        </div>
      </div>
    );
  }

  // Hata gösterimi
  if (error) {
    return (
      <div className='container mx-auto py-10 px-4 min-h-screen'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          İzlediğim Filmler
        </h1>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Film bulunamadı gösterimi
  if (movies.length === 0 && !loading) {
    return (
      <div className='container mx-auto py-10 px-4 min-h-screen'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          İzlediğim Filmler
        </h1>
        <div className='bg-gray-100 border border-gray-300 text-gray-700 px-4 py-8 rounded text-center'>
          <p className='text-xl'>Henüz izlediğiniz bir film bulunmuyor.</p>
          <Link
            href='/movies'
            className='mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
          >
            Filmleri Keşfet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-10 px-4 min-h-screen'>
      <h1 className='text-3xl font-bold mb-8 text-center'>İzlediğim Filmler</h1>

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
        {movies.map((movie) => (
          <div
            key={movie.id}
            className='bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105'
          >
            <div className='relative h-64 w-full'>
              {movie.poster_path ? (
                <Image
                  src={
                    movie.poster_path.startsWith("http")
                      ? movie.poster_path
                      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  }
                  alt={movie.title}
                  fill
                  sizes='(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                  style={{ objectFit: "cover" }}
                  loading='lazy'
                />
              ) : (
                <div className='flex items-center justify-center h-full bg-gray-200'>
                  <span className='text-gray-400 text-xl'>Resim Yok</span>
                </div>
              )}
            </div>

            <div className='p-4'>
              <h2 className='text-lg font-semibold mb-2 line-clamp-2'>
                {movie.title}
              </h2>

              <div className='flex items-center mb-2'>
                {getStarRating(movie.vote_average || 0)}
                <span className='ml-1 text-sm text-gray-600'>
                  ({(movie.vote_average || 0).toFixed(1)}/10)
                </span>
              </div>

              <p className='text-sm text-gray-600 mb-2'>
                {formatDate(movie.release_date)}
              </p>

              <p className='text-sm text-gray-600 mb-3 line-clamp-1'>
                {parseGenres(movie.genres)}
              </p>

              {movie.watched_at && (
                <p className='text-xs text-gray-500 mt-2'>
                  İzlenme Tarihi: {formatDate(movie.watched_at)}
                </p>
              )}

              <Link
                href={`/movies/${movie.id}`}
                className='block text-center mt-3 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors'
              >
                Detayları Gör
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
