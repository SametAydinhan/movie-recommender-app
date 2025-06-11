"use client";
import React, { useEffect, useState, cache } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaStar,
  FaStarHalf,
  FaRegStar,
  FaArrowLeft,
  FaCheckCircle,
  FaPlusCircle,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { addToWatched, removeFromWatched } from "@/store/features/moviesSlice";
import { toggleWatchedMovie } from "@/lib/utils/api-movies";
import { getAuthToken } from "@/utils/auth";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  runtime: number;
  overview: string;
  genres: string;
  production_companies: string;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  original_language: string;
  credits?: {
    id: number;
    cast: string;
    crew: string;
  };
  keywords?: {
    id: number;
    keywords: string;
  };
}

export default function MovieDetail({ params }: { params: { id: string } }) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tüm TypeScript hatalarını önlemek için basit bir yaklaşım
  const movieId: string =
    // @ts-ignore - Next.js ile uyumluluk için izin verildi
    React.use ? React.use(params)?.id : params.id;

  useEffect(() => {
    const fetchMovieDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3001/api/movies/${movieId}`
        );

        if (!response.ok) {
          throw new Error(`API hatası: ${response.status}`);
        }

        const data = await response.json();
        setMovie(data);
      } catch (error) {
        console.error("Film detayı alınırken hata:", error);
        setError("Film detayları yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovieDetail();
    }
  }, [movieId]);

  // Resim URL'lerini oluşturma
  const getImageUrl = async (
    path: string | null,
    type: "poster" | "backdrop" | "profile" = "poster",
    title?: string
  ): Promise<string> => {
    if (!path || path === "" || path === "null") {
      // Profil fotoğrafları için
      if (type === "profile") {
        return "/no-image.jpg";
      }

      // Poster veya backdrop için OMDB'den almayı dene
      if (type === "poster" && title) {
        try {
          // Film adını URL için uygun hale getir
          const encodedTitle = encodeURIComponent(title);

          // OMDB API anahtarı
          const OMDB_API_KEY = "9f7b41cb";

          const response = await fetch(
            `https://www.omdbapi.com/?t=${encodedTitle}&apikey=${OMDB_API_KEY}`
          );
          const data = await response.json();

          if (
            data.Response === "True" &&
            data.Poster &&
            data.Poster !== "N/A"
          ) {
            return data.Poster;
          }
        } catch (error) {
          console.error("OMDB'den resim alınırken hata:", error);
        }
      }

      return "/no-image.jpg";
    }

    // Yol zaten tam URL ise doğrudan kullan
    if (path.startsWith("http")) {
      return path;
    }

    // Yolun başında '/' olduğundan emin ol
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;

    let size = "";
    switch (type) {
      case "poster":
        size = "w600_and_h900_bestv2";
        break;
      case "backdrop":
        size = "w1280";
        break;
      case "profile":
        size = "w185";
        break;
    }

    return `https://www.themoviedb.org/t/p/${size}${pathWithSlash}`;
  };

  // Oyuncu resimlerini hazırlama
  const [actorImages, setActorImages] = useState<Record<string, string>>({});
  const [actorImagesLoading, setActorImagesLoading] = useState<
    Record<string, boolean>
  >({});

  // Varsayılan resimler kütüphanesi
  const defaultImages = [
    "/movie-placeholder-1.jpg",
    "/movie-placeholder-2.jpg",
    "/movie-placeholder-3.jpg",
    "/movie-placeholder-4.jpg",
    "/movie-placeholder-5.jpg",
  ];

  // Resmin var olup olmadığını kontrol et
  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Film resimleri için durum değişkenleri
  const [posterLoading, setPosterLoading] = useState(true);
  const [backdropLoading, setBackdropLoading] = useState(true);
  const [posterUrl, setPosterUrl] = useState("/No-Poster.png");
  const [backdropUrl, setBackdropUrl] = useState("/No-Poster.png");

  useEffect(() => {
    // Film verisi geldiğinde resimleri hazırla
    const prepareImages = async () => {
      if (!movie) {
        return; // Film verisi yoksa işlem yapma
      }

      try {
        setPosterLoading(true);

        // Poster için
        if (
          movie.poster_path &&
          movie.poster_path !== "null" &&
          movie.poster_path !== ""
        ) {
          const posterPath = movie.poster_path.startsWith("/")
            ? movie.poster_path
            : `/${movie.poster_path}`;

          // Ana sayfada kullanılan URL formatını kullan
          const tmdbUrl = `https://image.tmdb.org/t/p/original${posterPath}`;

          setPosterUrl(tmdbUrl);
          setPosterLoading(false);
        } else {
          // Varsayılan No-Poster resmi kullan
          setPosterUrl("/No-Poster.png");
          setPosterLoading(false);
        }
      } catch (error) {
        console.error("Film resimleri hazırlanırken hata:", error);
        // Hata durumunda varsayılan resimler kullan
        setPosterUrl("/No-Poster.png");
        setPosterLoading(false);
      }
    };

    prepareImages();
  }, [movie]);

  useEffect(() => {
    // Oyuncular için resimleri hazırla
    const prepareActorImages = async () => {
      if (!movie || !movie.credits || !movie.credits.cast) {
        return; // Film veya oyuncu verisi yoksa çıkış yap
      }

      try {
        const castData = JSON.parse(movie.credits.cast);

        if (!Array.isArray(castData) || castData.length === 0) {
          return; // Cast verisi boşsa işlem yapma
        }

        // İlk olarak tüm oyuncular için yükleniyor durumunu ayarla
        const loadingState: Record<string, boolean> = {};

        for (const actor of castData) {
          if (!actor || !actor.id) {
            continue; // Geçersiz oyuncu verisi varsa atla
          }

          const key = `${actor.id}-${actor.cast_id || "0"}`;
          loadingState[key] = true;
        }

        setActorImagesLoading(loadingState);

        // Şimdi resimleri yükle
        const imageMap: Record<string, string> = {};

        for (const actor of castData) {
          if (!actor || !actor.id) {
            continue; // Geçersiz oyuncu verisi varsa atla
          }

          const key = `${actor.id}-${actor.cast_id || "0"}`;

          try {
            if (
              actor.profile_path &&
              actor.profile_path !== "null" &&
              actor.profile_path !== ""
            ) {
              const profilePath = actor.profile_path.startsWith("/")
                ? actor.profile_path
                : `/${actor.profile_path}`;

              const tmdbUrl = `https://www.themoviedb.org/t/p/w185${profilePath}`;

              // Resmin var olup olmadığını kontrol et
              const imageExists = await checkImageExists(tmdbUrl);

              if (imageExists) {
                imageMap[key] = tmdbUrl;
                setActorImagesLoading((prev) => ({ ...prev, [key]: false }));
                continue;
              }
            }

            // Resim bulunamadıysa harfle göster
            imageMap[key] = "";
            setActorImagesLoading((prev) => ({ ...prev, [key]: false }));
          } catch (error) {
            console.error(
              `Oyuncu ${actor.name} için resim yüklenirken hata:`,
              error
            );
            imageMap[key] = "";
            setActorImagesLoading((prev) => ({ ...prev, [key]: false }));
          }
        }

        setActorImages(imageMap);
      } catch (error) {
        console.error("Oyuncu resimleri yüklenirken hata:", error);
      }
    };

    prepareActorImages();
  }, [movie]);

  // Yıldız sayısını hesaplayan yardımcı fonksiyon
  const getStarRating = (rating: number) => {
    // 10 üzerinden değerlendirmeyi 5 üzerine çevir
    const convertedRating = rating / 2;
    const fullStars = Math.floor(convertedRating);
    const hasHalfStar = convertedRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className='flex items-center'>
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full_${i}`} className='text-yellow-400 w-5 h-5' />
        ))}
        {hasHalfStar && <FaStarHalf className='text-yellow-400 w-5 h-5' />}
        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty_${i}`} className='text-yellow-400 w-5 h-5' />
        ))}
      </div>
    );
  };

  // JSON string'den objeler oluşturma
  const parseJsonString = (jsonString: string, type: string): any[] => {
    try {
      if (!jsonString) return [];

      const parsedData = JSON.parse(jsonString);

      if (type === "cast" && Array.isArray(parsedData)) {
        return parsedData.slice(0, 10); // İlk 10 oyuncu
      } else if (type === "crew" && Array.isArray(parsedData)) {
        return parsedData.filter(
          (person) => person.job === "Director" || person.job === "Producer"
        );
      } else if (type === "genres" && Array.isArray(parsedData)) {
        return parsedData;
      } else if (type === "keywords" && Array.isArray(parsedData)) {
        return parsedData.slice(0, 15); // İlk 15 anahtar kelime
      } else if (type === "companies" && Array.isArray(parsedData)) {
        return parsedData.slice(0, 5); // İlk 5 şirket
      }

      return [];
    } catch (error) {
      console.error(`${type} ayrıştırma hatası:`, error);
      return [];
    }
  };

  // Tarih formatını düzenleme
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return "";
    }
  };

  // Para formatını düzenleme
  const formatCurrency = (amount: number): string => {
    if (!amount) return "Bilinmiyor";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Film türleri, oyuncular ve diğer verileri çıkarma
  const genres = movie ? parseJsonString(movie.genres, "genres") : [];
  const cast = movie?.credits
    ? parseJsonString(movie.credits.cast, "cast")
    : [];
  const crew = movie?.credits
    ? parseJsonString(movie.credits.crew, "crew")
    : [];
  const keywords = movie?.keywords
    ? parseJsonString(movie.keywords.keywords, "keywords")
    : [];
  const companies = movie
    ? parseJsonString(movie.production_companies, "companies")
    : [];

  const dispatch = useDispatch<AppDispatch>();
  const watchedMovies = useSelector(
    (state: RootState) => state.movies.watchedMovies
  );
  const isWatched = watchedMovies.includes(Number(movieId));

  const handleToggleWatched = async () => {
    if (!movie) return;

    try {
      // Kullanıcı giriş yapıp yapmadığını kontrol et
      const token = getAuthToken();
      if (!token) {
        alert("Bu işlemi yapabilmek için giriş yapmalısınız.");
        return;
      }

      // İzlendi durumunu değiştir
      if (isWatched) {
        // Redux state'ini güncelle - listeden çıkar
        dispatch(removeFromWatched(movie.id));
      } else {
        // Redux state'ini güncelle - listeye ekle
        dispatch(addToWatched(movie.id));
      }

      // API isteğini yap
      const result = await toggleWatchedMovie(movie.id, isWatched);

      if (!result.success) {
        // API işlemi başarısız olursa, Redux değişikliklerini geri al
        if (isWatched) {
          dispatch(addToWatched(movie.id));
        } else {
          dispatch(removeFromWatched(movie.id));
        }
        throw new Error(result.message);
      }

      // Başarı mesajını göster
      alert(result.message);
    } catch (error: any) {
      console.error("Film listesini güncelleme hatası:", error);
      alert(error.message || "İşlem sırasında bir hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-5xl mx-auto px-4 py-8'>
        <div className='text-red-500 text-center p-6 bg-red-100 rounded-lg'>
          <h2 className='text-2xl font-bold mb-4'>Hata</h2>
          <p>{error}</p>
          <Link
            href='/movies'
            className='mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline'
          >
            <FaArrowLeft /> Filmlere Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className='max-w-5xl mx-auto px-4 py-8'>
        <div className='text-center p-6 bg-gray-100 rounded-lg'>
          <h2 className='text-2xl font-bold mb-4'>Film Bulunamadı</h2>
          <Link
            href='/movies'
            className='mt-4 inline-flex items-center gap-2 text-blue-600 hover:underline'
          >
            <FaArrowLeft /> Filmlere Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen pb-16 pt-8 bg-gray-900'>
      <div className='max-w-6xl mx-auto px-4 relative z-10'>
        <Link
          href='/movies'
          className='inline-flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full mb-8 transition-colors'
        >
          <FaArrowLeft /> Filmlere Dön
        </Link>

        <div className='flex flex-col md:flex-row gap-8 mt-4'>
          {/* Film posteri */}
          <div className='flex-shrink-0'>
            <div className='relative w-full md:w-80 h-[450px] rounded-xl overflow-hidden shadow-xl'>
              {posterLoading ? (
                <div className='absolute inset-0 flex items-center justify-center bg-gray-700 rounded-xl'>
                  <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
                </div>
              ) : (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  style={{ objectFit: "cover" }}
                  className='rounded-xl'
                  unoptimized
                />
              )}
            </div>
          </div>

          {/* Film bilgileri */}
          <div className='flex-grow'>
            <h1 className='text-3xl md:text-4xl font-bold text-white mb-2'>
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className='text-gray-300 text-lg italic mb-4'>
                {movie.tagline}
              </p>
            )}

            <div className='flex flex-wrap items-center gap-4 mb-6'>
              <div className='flex items-center gap-2'>
                {getStarRating(movie.vote_average)}
                <span className='text-white font-medium'>
                  {movie.vote_average.toFixed(1)} / 10
                </span>
                <span className='text-gray-300'>({movie.vote_count} oy)</span>
              </div>

              {movie.release_date && (
                <div className='text-gray-300'>
                  {formatDate(movie.release_date)}
                </div>
              )}

              {movie.runtime > 0 && (
                <div className='text-gray-300'>
                  {Math.floor(movie.runtime / 60)}s {movie.runtime % 60}dk
                </div>
              )}

              {movie.status && (
                <div className='px-3 py-1 rounded bg-blue-900 text-white text-sm'>
                  {movie.status}
                </div>
              )}

              {/* İzlediklerime ekle butonu */}
              <button
                onClick={handleToggleWatched}
                className={`px-3 py-1 rounded text-white text-sm flex items-center gap-1 transition-colors ${
                  isWatched
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {isWatched ? (
                  <>
                    <FaCheckCircle className='mr-1' /> İzlediğim Film
                  </>
                ) : (
                  <>
                    <FaPlusCircle className='mr-1' /> İzlediklerime Ekle
                  </>
                )}
              </button>
            </div>

            {genres.length > 0 && (
              <div className='mb-6'>
                <h3 className='text-lg font-medium text-white mb-2'>Türler</h3>
                <div className='flex flex-wrap gap-2'>
                  {genres.map((genre: any) => (
                    <span
                      key={genre.id}
                      className='px-3 py-1 rounded bg-gray-700 text-white text-sm'
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {movie.overview && (
              <div className='mb-6'>
                <h3 className='text-lg font-medium text-white mb-2'>Özet</h3>
                <p className='text-gray-300 leading-relaxed'>
                  {movie.overview}
                </p>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
              {(movie.budget > 0 || movie.revenue > 0) && (
                <div>
                  <h3 className='text-lg font-medium text-white mb-2'>
                    Finansal Bilgiler
                  </h3>
                  <div className='space-y-1'>
                    <p className='text-gray-300'>
                      <span className='font-medium'>Bütçe:</span>{" "}
                      {formatCurrency(movie.budget)}
                    </p>
                    <p className='text-gray-300'>
                      <span className='font-medium'>Hasılat:</span>{" "}
                      {formatCurrency(movie.revenue)}
                    </p>
                  </div>
                </div>
              )}

              {companies.length > 0 && (
                <div>
                  <h3 className='text-lg font-medium text-white mb-2'>
                    Yapım Şirketleri
                  </h3>
                  <div className='text-gray-300'>
                    {companies.map((company: any, index: number) => (
                      <span key={company.id}>
                        {company.name}
                        {index < companies.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {cast.length > 0 && (
              <div className='mb-6'>
                <h3 className='text-lg font-medium text-white mb-2'>
                  Başlıca Oyuncular
                </h3>
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3'>
                  {cast.map((actor: any) => (
                    <div
                      key={`${actor.id}-${actor.cast_id}`}
                      className='text-center'
                    >
                      <div className='w-16 h-16 mx-auto rounded-full bg-gray-700 overflow-hidden mb-2'>
                        {actor.profile_path ? (
                          <>
                            {actorImagesLoading[
                              `${actor.id}-${actor.cast_id}`
                            ] ? (
                              <div className='w-full h-full flex items-center justify-center'>
                                <div className='animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500'></div>
                              </div>
                            ) : actorImages[`${actor.id}-${actor.cast_id}`] ? (
                              <Image
                                src={
                                  actorImages[`${actor.id}-${actor.cast_id}`]
                                }
                                alt={actor.name}
                                width={64}
                                height={64}
                                className='w-full h-full object-cover'
                                unoptimized
                              />
                            ) : (
                              <div className='w-full h-full flex items-center justify-center text-gray-400'>
                                {actor.name.charAt(0)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-gray-400'>
                            {actor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className='text-white text-sm font-medium'>
                        {actor.name}
                      </p>
                      <p className='text-gray-400 text-xs'>{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {crew.length > 0 && (
              <div className='mb-6'>
                <h3 className='text-lg font-medium text-white mb-2'>
                  Yönetmen & Yapımcılar
                </h3>
                <div className='flex flex-wrap gap-4'>
                  {crew.map((person: any) => (
                    <div
                      key={`${person.id}-${person.job}`}
                      className='text-gray-300'
                    >
                      <span className='font-medium'>{person.name}</span>
                      <span className='text-sm text-gray-400 ml-1'>
                        ({person.job})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <h3 className='text-lg font-medium text-white mb-2'>
                  Anahtar Kelimeler
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {keywords.map((keyword: any) => (
                    <span
                      key={keyword.id}
                      className='px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs'
                    >
                      {keyword.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
