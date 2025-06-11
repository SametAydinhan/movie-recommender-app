"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/utils/auth";
import type {
  Movie,
  ApiResponse,
  PosterInfo,
  ImageLoadingStates,
} from "@/lib/types";
import {
  fetchUserInfo,
  fetchWatchedMovies,
  fetchAlternativeWatchedMovies,
  removeFromWatchlist,
  processMoviePosters,
} from "@/lib/utils/api";
import { loadPosterImages } from "@/lib/utils/image";
import { GoKebabHorizontal } from "react-icons/go";
import { FaTrash, FaStopwatch, FaEye } from "react-icons/fa";
import {
  formatWatchTimeDetailed,
  formatWatchTime,
} from "@/lib/utils/formatters";
import { Pagination } from "@/app/components/Movies";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  fetchWatchedMoviesAsync,
  removeFromWatched,
} from "@/store/features/moviesSlice";

export default function MyMovies() {
  const dispatch = useDispatch<AppDispatch>();
  const { watchedMovies } = useSelector((state: RootState) => state.movies);

  // Temel state'ler
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Görsel durumu
  const [isImageLoading, setIsImageLoading] = useState<ImageLoadingStates>({});
  const [moviePosters, setMoviePosters] = useState<PosterInfo>({});

  // Menü durumu
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMovies, setTotalMovies] = useState(0);

  // İzleme süresi
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [watchTimeFormatted, setWatchTimeFormatted] = useState("0 dakika");

  const router = useRouter();

  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenu !== null) {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".menu-button") &&
          !target.closest(".dropdown-menu")
        ) {
          setOpenMenu(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

  // Kullanıcının oturum durumunu kontrol et ve sayfa değiştiğinde filmleri yükle
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        setIsLoggedIn(true);

        // Redux ile izlenen filmleri getir
        dispatch(fetchWatchedMoviesAsync());

        await loadWatchedMovies(currentPage);
      } else {
        setIsLoggedIn(false);
        setLoading(false);
        // Giriş yapmayan kullanıcıları login sayfasına yönlendir
        router.push("/users/login");
      }
    };

    checkAuth();
  }, [router, currentPage, dispatch]);

  // Ana veri yükleme fonksiyonu
  const loadWatchedMovies = useCallback(async (page: number) => {
    try {
      // İlk sayfayı yüklerken tam yükleme göster, sayfa değişiminde sadece içerik yüklemesi göster
      if (page === 1) {
        setLoading(true);
      } else {
        setContentLoading(true);
      }

      // Kullanıcı bilgilerini getir
      const userInfoResult = await fetchUserInfo();
      if ("error" in userInfoResult) {
        throw new Error(
          `Kullanıcı bilgileri alınamadı: ${userInfoResult.error}`
        );
      }

      // İzlenen filmleri getir
      let response: ApiResponse;
      try {
        // Normal API yöntemi - sayfa ve limit bilgilerini belirterek çağır
        console.log(
          `Kullanıcı ${userInfoResult.userId} için filmler getiriliyor. Sayfa: ${page}, Limit: 20`
        );
        response = await fetchWatchedMovies(userInfoResult.userId, page, 20);

        if (response.error) {
          throw new Error(response.error);
        }
      } catch (apiError: any) {
        console.warn("API hatası, alternatif yöntem kullanılıyor:", apiError);

        // Kullanıcıya bilgi ver
        setError(
          `Film verilerine erişilemiyor: ${
            apiError.message || "Bilinmeyen hata"
          }`
        );

        try {
          // Alternatif yöntem - sayfa ve limit bilgilerini belirterek çağır
          response = await fetchAlternativeWatchedMovies(page, 20);

          if (response.error) {
            throw new Error(response.error);
          }
        } catch (altError: any) {
          console.error("Alternatif yöntem de başarısız oldu:", altError);
          throw new Error(`Film verileri alınamadı: ${altError.message}`);
        }
      }

      if (!response.movies || !Array.isArray(response.movies)) {
        console.error("API yanıtı beklenen formatta değil:", response);
        throw new Error(
          "Film verileri alınamadı: Sunucu beklenen formatta veri döndürmedi"
        );
      }

      // Sayfalama ve toplam film bilgilerini güncelle
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
        setTotalMovies(response.pagination.total || 0);
      } else {
        console.warn("API yanıtında pagination bilgisi bulunamadı");
        setTotalPages(1);
        setTotalMovies(response.movies.length);
      }

      // Sadece mevcut sayfadaki filmleri işle, diğer filmleri temizle
      const processedMovies = processMoviePosters(response.movies);

      if (processedMovies.length === 0) {
        console.log(`Sayfa ${page} için film bulunamadı.`);
      } else {
        console.log(
          `${processedMovies.length} film başarıyla yüklendi. Sayfa: ${page}/${
            response.pagination?.totalPages || 1
          }`
        );
      }

      // Toplam izleme süresini hesapla - sadece filmlerin runtime değerleri toplamı için
      let totalRuntime = 0;
      if (response.pagination && response.pagination.total) {
        // API'den toplam film sayısını alıp, ortalama film uzunluğu ile çarp
        // Bu, tüm filmlerin ortalama süresini tahmin etmek için basit bir hesaplama
        const avgMovieLength =
          processedMovies.reduce(
            (total, movie) => total + (movie.runtime || 0),
            0
          ) / (processedMovies.length || 1);

        totalRuntime = Math.round(response.pagination.total * avgMovieLength);
      } else {
        // Pagination bilgisi yoksa, sadece mevcut filmlerin sürelerini topla
        totalRuntime = processedMovies.reduce(
          (total, movie) => total + (movie.runtime || 0),
          0
        );
      }

      setTotalWatchTime(totalRuntime);

      // Aynı anda izleme istatistiklerini de çekelim
      // Bu sayede profil sayfasıyla aynı veriyi kullanacağız
      try {
        const statsResponse = await fetch(
          "http://localhost:3001/api/users/me/stats",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getAuthToken()}`,
            },
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.stats && statsData.stats.watchTimeFormatted) {
            // Backend'den gelen değeri doğrudan kullan
            setWatchTimeFormatted(statsData.stats.watchTimeFormatted);
          } else {
            // Backend'den değer gelmezse formatWatchTime ile hesapla
            setWatchTimeFormatted(formatWatchTime(totalRuntime));
          }
        } else {
          // API yanıt vermezse formatWatchTime ile hesapla
          setWatchTimeFormatted(formatWatchTime(totalRuntime));
        }
      } catch (error) {
        console.error("İzleme istatistikleri alınamadı:", error);
        // Hata durumunda formatWatchTime ile hesapla
        setWatchTimeFormatted(formatWatchTime(totalRuntime));
      }

      // Filmleri güncelle - önceki filmler yerine sadece mevcut sayfadaki filmleri göster
      setMovies(processedMovies);

      // Posterleri yükle
      try {
        const posterUrls = await loadPosterImages(processedMovies);
        setMoviePosters(posterUrls);

        // Resimlerin yüklenmesi tamamlandı, yükleme durumlarını güncelle
        const loadedStates: ImageLoadingStates = {};
        processedMovies.forEach((movie: Movie) => {
          loadedStates[movie.id] = false;
        });
        setIsImageLoading(loadedStates);
      } catch (posterError: any) {
        console.error("Posterler yüklenirken hata:", posterError);
        // Poster hataları kritik değil, devam edebiliriz
      }

      // Hata mesajını temizle (eğer önceden hata varsa)
      setError("");
    } catch (error: any) {
      console.error("Filmler alınırken hata:", error);
      setError(error.message || "Filmler yüklenemedi");
      setMovies([]);
      setTotalWatchTime(0);
      setTotalPages(1);
      setTotalMovies(0);
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  }, []);

  // Sayfa değiştirme işlemi
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages]
  );

  // Menüyü açma/kapama
  const toggleMenu = useCallback(
    (e: React.MouseEvent, movieId: number) => {
      e.preventDefault(); // Link'in çalışmasını engelle
      e.stopPropagation(); // Event'in parent'lara ulaşmasını engelle

      setOpenMenu(openMenu === movieId ? null : movieId);
    },
    [openMenu]
  );

  // Film izleme listesinden çıkar
  const handleRemoveFromWatchlist = useCallback(
    async (e: React.MouseEvent, movieId: number) => {
      e.preventDefault();
      e.stopPropagation();

      const result = await removeFromWatchlist(movieId);

      if (result.success) {
        // Başarılı yanıt aldıktan sonra aynı sayfayı yeniden yükle
        await loadWatchedMovies(currentPage);

        // Menüyü kapat
        setOpenMenu(null);

        // Kullanıcıya bilgi ver
        alert(result.message);
      } else {
        alert(result.message);
      }
    },
    [currentPage, loadWatchedMovies]
  );

  // Burada MovieGrid, Pagination ve diğer componentlerin içeriğini doğrudan bu dosyada renderleyeceğiz
  // Daha sonra uygun komponentlere ayırabiliriz

  // Yükleniyor gösterimi
  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  // Hata gösterimi
  if (error) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='text-red-500 text-center p-6 bg-red-100 rounded-lg'>
          <h2 className='text-2xl font-bold mb-4'>Hata</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Film bulunamadı gösterimi
  if (movies.length === 0 && !loading) {
    // EmptyWatchedList komponenti içeriği
    return (
      <div className='min-h-screen pb-16'>
        <div className='max-w-7xl mx-auto px-4 pt-16'>
          <div className='flex flex-col md:flex-row justify-between items-center mb-12'>
            <div className='flex flex-col mb-4 md:mb-0'>
              <h1 className='text-4xl font-bold text-white mb-2'>
                İzlediğim Filmler
              </h1>
              <p className='text-gray-400'>
                Henüz izlediğiniz bir film bulunmuyor.
              </p>
            </div>
          </div>

          <div className='flex flex-col items-center justify-center py-12 px-4'>
            <div className='bg-gray-800 rounded-lg p-8 text-center max-w-lg'>
              <svg
                className='w-16 h-16 text-blue-400 mx-auto mb-4'
                fill='currentColor'
                viewBox='0 0 20 20'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path d='M10 12a2 2 0 100-4 2 2 0 000 4z'></path>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v1a1 1 0 102 0V5zm-1 8a1 1 0 100-2 1 1 0 000 2z'
                  clipRule='evenodd'
                ></path>
              </svg>
              <h2 className='text-2xl font-bold text-white mb-4'>
                İzleme listeniz boş
              </h2>
              <p className='text-gray-400 mb-6'>
                Henüz izlediğiniz bir film bulunmuyor. Filmleri keşfedin ve
                izleme listenize ekleyin.
              </p>
              <a
                href='/movies'
                className='inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors'
              >
                Filmleri Keşfet
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Film gridi için yardımcı fonksiyon
  const renderMovieCard = (movie: Movie) => (
    <div key={movie.id} className='relative group'>
      <a
        href={`/movies/${movie.id}`}
        className='block bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:-translate-y-2'
      >
        <div className='relative w-full h-[300px]'>
          {/* Yükleme durumu göstergesi */}
          {isImageLoading[movie.id] && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-200'>
              <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
            </div>
          )}

          {/* Film posteri */}
          {moviePosters[movie.id] && (
            <div
              className={`w-full h-full transition-opacity duration-300 ${
                isImageLoading[movie.id] ? "opacity-0" : "opacity-100"
              }`}
            >
              <img
                src={moviePosters[movie.id]}
                alt={movie.title}
                className='w-full h-full object-cover transition-opacity duration-300'
                onError={(e) => {
                  // Resim yüklenemezse yedek görsel kullan
                  const target = e.target as HTMLImageElement;

                  // Önce diğer TMDB boyutunu dene
                  if (target.src.includes("w500")) {
                    target.src = target.src.replace("w500", "original");
                  } else if (!target.src.includes("/no-poster.png")) {
                    // Son çare olarak yerel yedek görseli kullan
                    target.src = "/no-poster.png";
                  }
                }}
              />
            </div>
          )}

          {/* Üç nokta menü butonu */}
          <button
            onClick={(e) => toggleMenu(e, movie.id)}
            className='menu-button absolute top-2 right-2 w-8 h-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white hover:bg-opacity-70 z-30'
            aria-label='Menüyü aç'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M10 2a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4z'
                clipRule='evenodd'
              />
            </svg>
          </button>

          {/* İzlendi işareti */}
          <div className='absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
            İzlendi
          </div>

          {/* İzleme tarihi işareti */}
          {movie.watched_at && (
            <div className='absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs py-1 px-2 rounded z-10'>
              İzlenme:{" "}
              {new Intl.DateTimeFormat("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(movie.watched_at))}
            </div>
          )}

          {/* Açılır menü */}
          {openMenu === movie.id && (
            <div className='dropdown-menu absolute top-12 right-2 w-48 bg-white rounded-md shadow-lg z-40 overflow-hidden'>
              <button
                onClick={(e) => handleRemoveFromWatchlist(e, movie.id)}
                className='w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center'
              >
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
                İzlenenlerden Çıkar
              </button>
            </div>
          )}
        </div>
        <div className='p-4'>
          {/* Film başlığı */}
          <h3
            className='text-lg font-semibold text-gray-800 truncate mb-2'
            title={movie.title}
          >
            {movie.title}
          </h3>

          {/* Puan yıldızları */}
          <div className='flex items-center mb-2'>
            {renderStarRating(movie.vote_average || 0)}
            <span className='text-sm text-gray-600 ml-1'>
              ({(movie.vote_average || 0).toFixed(1)})
            </span>
          </div>

          {/* Tarih ve Süre - yeni stilde */}
          <div className='text-sm text-gray-600 mb-1 flex flex-wrap gap-2'>
            <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block'>
              {new Intl.DateTimeFormat("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(movie.release_date))}
            </span>
            {movie.runtime > 0 && (
              <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block flex items-center'>
                <svg
                  className='w-3 h-3 mr-1'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z' />
                </svg>
                {movie.runtime} dk
              </span>
            )}
          </div>
        </div>
      </a>
    </div>
  );

  // Yıldız puanlama fonksiyonu
  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg
          key={`full_${i}`}
          className='w-4 h-4 text-yellow-400'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
        </svg>
      );
    }

    if (halfStar) {
      stars.push(
        <svg
          key='half'
          className='w-4 h-4 text-yellow-400'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M10 15.933l4.25 2.12v-8.77L10 6.256V15.933z'
          />
          <path
            fillRule='evenodd'
            d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
            clipRule='evenodd'
          />
        </svg>
      );
    }

    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg
          key={`empty_${i}`}
          className='w-4 h-4 text-yellow-400'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
          />
        </svg>
      );
    }

    return stars;
  };

  const WatchedMoviesHeader = React.memo(
    ({
      totalMovies,
      totalWatchTime,
      watchTimeFormatted,
    }: {
      totalMovies: number;
      totalWatchTime: number;
      watchTimeFormatted: string;
    }) => {
      const watchTimeDetails = formatWatchTimeDetailed(totalWatchTime);
      const [showDetails, setShowDetails] = useState(false);

      return (
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-6 bg-gray-900 p-4 rounded-lg shadow-md'>
          <h1 className='text-2xl font-bold text-white mb-2 sm:mb-0'>
            İzlediğim Filmler
          </h1>

          <div className='flex flex-col items-end'>
            <div
              className='flex items-center cursor-pointer hover:opacity-80 transition-opacity'
              onClick={() => setShowDetails(!showDetails)}
            >
              <FaStopwatch className='text-teal-400 mr-2' />
              <span className='text-teal-400 font-medium'>
                {watchTimeFormatted}
              </span>
              <span className='text-gray-300 ml-4'>
                <FaEye className='inline mr-1' /> {totalMovies} film
              </span>
            </div>

            {showDetails && (
              <div className='mt-3 p-3 bg-gray-800 rounded-md shadow-lg text-sm max-w-md'>
                <p className='text-gray-300 mb-2'>
                  <span className='font-medium text-teal-400'>
                    Toplam izleme süresi:
                  </span>{" "}
                  {watchTimeFormatted}
                </p>
                <p className='text-gray-300 mb-2'>
                  <span className='font-medium text-teal-400'>
                    Eğitim değeri:
                  </span>{" "}
                  {watchTimeDetails.educationalValue}
                </p>
                <p className='text-gray-300'>
                  <span className='font-medium text-teal-400'>
                    Kitap eşdeğeri:
                  </span>{" "}
                  {watchTimeDetails.bookEquivalent} (ortalama 300 sayfa)
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
  );

  return (
    <div className='min-h-screen pb-16'>
      <div className='max-w-7xl mx-auto px-4 pt-16'>
        {/* Başlık ve İstatistikler */}
        <div className='flex flex-col space-y-4 mb-6'>
          <WatchedMoviesHeader
            totalMovies={totalMovies}
            totalWatchTime={totalWatchTime}
            watchTimeFormatted={watchTimeFormatted}
          />
        </div>

        {/* Film İçeriği */}
        <div className='movie-content-section'>
          {contentLoading ? (
            <div className='flex justify-center items-center py-20'>
              <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
            </div>
          ) : (
            <>
              {movies.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
                  {movies.map((movie) => renderMovieCard(movie))}
                </div>
              ) : (
                <div className='text-center py-20'>
                  <p className='text-xl text-gray-400'>
                    İzlenen film bulunamadı.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Sayfalama - Burada renderPagination yerine Pagination bileşenini kullanıyoruz */}
          {!contentLoading && movies.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
