"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaStarHalf, FaRegStar, FaSearch } from "react-icons/fa";
import { getAuthToken } from "@/utils/auth";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  runtime: number;
  overview: string;
  genres: string;
  belongs_to_collection: any; // Koleksiyon bilgisi, null olabilir
  tmdbId?: string; // TMDB kimliği, API'den geliyor
}

export default function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false); // Sadece içerik için yükleme durumu
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isImageLoading, setIsImageLoading] = useState<{
    [key: number]: boolean;
  }>({});

  // İzlenen filmler listesi için state
  const [watchedMovies, setWatchedMovies] = useState<number[]>([]);
  // İzleme listesindeki filmler için state
  const [watchlistMovies, setWatchlistMovies] = useState<number[]>([]);
  // Açık menüyü izleme için state
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Search input için ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Varsayılan resimler kütüphanesi
  const defaultImages = [
    "/movie-placeholder-1.jpg",
    "/movie-placeholder-2.jpg",
    "/movie-placeholder-3.jpg",
    "/movie-placeholder-4.jpg",
    "/movie-placeholder-5.jpg",
  ];

  // Filmler için posterler
  const [moviePosters, setMoviePosters] = useState<{ [key: number]: string }>(
    {}
  );

  // Kullanıcının oturum durumunu kontrol et
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");

  // Sayfa yüklendiğinde token kontrolü yap
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      if (token) {
        setToken(token);
        setIsLoggedIn(true);
        console.log("Kullanıcı giriş yapmış durumda, token mevcut");
      } else {
        setIsLoggedIn(false);
        setToken("");
        console.log("Kullanıcı giriş yapmamış");
      }
    };

    checkAuth();
  }, []);

  // Sayfa yüklendiğinde localStorage'dan izlenen filmleri getir
  useEffect(() => {
    const savedWatchedMovies = localStorage.getItem("watchedMovies");
    if (savedWatchedMovies) {
      try {
        setWatchedMovies(JSON.parse(savedWatchedMovies));
      } catch (error) {
        console.error("İzlenen filmler yüklenirken hata:", error);
        localStorage.removeItem("watchedMovies");
      }
    }

    // İzleme listesi filmlerini getir
    const savedWatchlistMovies = localStorage.getItem("watchlistMovies");
    if (savedWatchlistMovies) {
      try {
        setWatchlistMovies(JSON.parse(savedWatchlistMovies));
      } catch (error) {
        console.error("İzleme listesi yüklenirken hata:", error);
        localStorage.removeItem("watchlistMovies");
      }
    }
  }, []);

  // İzlenen filmler güncellendiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("watchedMovies", JSON.stringify(watchedMovies));
  }, [watchedMovies]);

  // İzleme listesi güncellendiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("watchlistMovies", JSON.stringify(watchlistMovies));
  }, [watchlistMovies]);

  // Debounce mekanizması - her yazmada değil, yazma durduktan sonra arama yapar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms bekleme süresi

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Arama değiştiğinde sayfayı 1'e sıfırla
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Film verilerini getiren fonksiyon - useCallback ile sararak yeniden oluşturulmasını önlüyoruz
  const fetchMovies = useCallback(async () => {
    // Sadece içerik bölümünü yükleme durumuna getir
    setContentLoading(true);

    try {
      // API URL'ini oluştur
      let apiUrl = "";

      // Arama yapılıyorsa SearchMovies API'sini kullan
      if (debouncedSearchTerm.trim() !== "") {
        // Frontend'in kullandığı basit arama API'sini kullan
        apiUrl = `http://localhost:3001/api/movies/search?page=${currentPage}&limit=20&search=${encodeURIComponent(
          debouncedSearchTerm.trim()
        )}`;
      } else {
        apiUrl = `http://localhost:3001/api/movies?page=${currentPage}&limit=20`;
      }

      console.log("API isteği yapılıyor:", apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `API hatası: ${response.status} - ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API yanıtı:", data);

        let moviesData: Movie[] = [];

        // API'nin döndürdüğü veri yapısını kontrol et
        if (data.results) {
          // Eski API formatı (results içinde)
          moviesData = Array.isArray(data.results) ? data.results : [];
          setTotalPages(data.total_pages || 1);
        } else if (data.movies) {
          // Yeni API formatı (movies içinde)
          moviesData = Array.isArray(data.movies) ? data.movies : [];
          setTotalPages(data.totalPages || 1);
        } else {
          // Hiçbir format uyumlu değilse, veriyi doğrudan kontrol et
          console.log("Doğrudan veri kontrolü:", data);
          if (Array.isArray(data)) {
            moviesData = data;
            setTotalPages(1);
          } else {
            moviesData = [];
            setError("API'den geçerli veri alınamadı.");
          }
        }

        setMovies(moviesData);
      } catch (fetchError: any) {
        console.error("Fetch işlemi sırasında hata:", fetchError);
        throw new Error(`Sunucuya bağlanılamıyor: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error("Filmler alınırken hata:", error);
      setError(`Filmler yüklenemedi: ${error.message || "Bilinmeyen hata"}`);
      setMovies([]);
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  // Film verilerini getir
  useEffect(() => {
    // Sayfa ilk yüklemede tüm sayfayı yükleniyor göster, sonraki sorgularda sadece içeriği
    if (currentPage === 1 && !debouncedSearchTerm) {
      setLoading(true);
    }

    fetchMovies();

    // Odak kontrolünü burada yapmayalım, bu farklı bir etkileşimdir
  }, [currentPage, debouncedSearchTerm, fetchMovies]);

  // Odağı koruma için ayrı bir useEffect (bu sadece odağı yönetir)
  useEffect(() => {
    // Odağı getir - eğer debouncedSearchTerm değiştiyse ve searchInputRef mevcut ise
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [movies]); // movies değiştiğinde (veri yüklendiğinde) odağı geri getir

  // Film kapak resimlerini hazırla
  useEffect(() => {
    // Movies kontrol et
    if (!movies || movies.length === 0) {
      return; // Filmler yoksa işlem yapma
    }

    // Her film için resim durumunu başlangıçta yükleniyor olarak ayarla
    const loadingStates: { [key: number]: boolean } = {};
    movies.forEach((movie) => {
      loadingStates[movie.id] = true;
    });
    setIsImageLoading(loadingStates);

    const loadPosterImages = async () => {
      // Her film için resim URL'si oluştur
      const posterUrls: { [key: number]: string } = {};

      for (const movie of movies) {
        try {
          // Film ID kontrolü
          if (!movie || !movie.id) {
            console.error("Geçersiz film verisi:", movie);
            continue;
          }

          // Koleksiyon kontrolü - özel bir fonksiyon kullanarak durumu kontrol et
          const collectionIsEmpty = isCollectionEmpty(
            movie.belongs_to_collection
          );

          // 1. Öncelikle TMDB ID'si varsa ve null değilse o ID üzerinden doğrudan resim URL'i oluştur
          if (
            movie.tmdbId &&
            movie.tmdbId !== "null" &&
            movie.tmdbId !== null
          ) {
            console.log(
              `Film ${movie.id} için TMDB ID bulundu: ${movie.tmdbId}`
            );
            const tmdbId = movie.tmdbId;

            // TMDB'nin resim URL'si
            let tmdbPosterUrl;

            // Önce poster_path kontrolü yap
            if (
              movie.poster_path &&
              movie.poster_path !== "null" &&
              movie.poster_path !== ""
            ) {
              const posterPath = movie.poster_path.startsWith("/")
                ? movie.poster_path
                : `/${movie.poster_path}`;
              tmdbPosterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
            } else {
              // Poster yoksa TMDB ID'si üzerinden default resim oluştur
              tmdbPosterUrl = `https://www.themoviedb.org/t/p/w500/movie/${tmdbId}`;
            }

            posterUrls[movie.id] = tmdbPosterUrl;
            setIsImageLoading((prev) => ({ ...prev, [movie.id]: false }));
            continue; // Diğer kontrolleri atla
          }

          // 2. TMDB ID yoksa, poster_path'e bak
          if (
            movie.poster_path &&
            movie.poster_path !== "null" &&
            movie.poster_path !== ""
          ) {
            const posterPath = movie.poster_path.startsWith("/")
              ? movie.poster_path
              : `/${movie.poster_path}`;

            // Resim URL'si oluştur - TMDB'nin doğru yapısını kullan
            const tmdbUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;

            // Varsayılan olarak kullanılabilir kabul et
            posterUrls[movie.id] = tmdbUrl;

            // Resim yüklendi olarak işaretle
            setIsImageLoading((prev) => ({ ...prev, [movie.id]: false }));
          } else {
            // 3. Poster yoksa koleksiyon durumuna göre default resim belirle
            // Koleksiyon boşsa, özel No-Poster kullan
            if (collectionIsEmpty) {
              posterUrls[movie.id] = "/No-Poster.png";
            } else {
              // Koleksiyon var ama poster path yok - varsayılan movie-placeholder kullan
              const defaultImageIndex = movie.id % defaultImages.length;
              posterUrls[movie.id] = defaultImages[defaultImageIndex];
            }
            // Resim yüklendi
            setIsImageLoading((prev) => ({ ...prev, [movie.id]: false }));
          }
        } catch (error) {
          console.error(`Film ${movie.id} için resim yüklenirken hata:`, error);
          // Hata durumunda varsayılan resim
          posterUrls[movie.id] = "/No-Poster.png";
          // Resim yüklendi (hatayla da olsa)
          setIsImageLoading((prev) => ({ ...prev, [movie.id]: false }));
        }
      }

      setMoviePosters(posterUrls);
    };

    if (movies.length > 0) {
      loadPosterImages();
    }
  }, [movies]);

  // Film izleme listesine ekleme/çıkarma
  const toggleWatchedMovie = async (e: React.MouseEvent, movieId: number) => {
    e.preventDefault(); // Link'in çalışmasını engelle
    e.stopPropagation(); // Event'in parent'lara ulaşmasını engelle

    // localStorage yerine auth.ts'den gelen getAuthToken() ile token kontrolü yap
    const currentToken = getAuthToken();

    // Kullanıcı giriş yapmış mı kontrol et
    if (!currentToken) {
      alert("Bu işlemi yapabilmek için giriş yapmalısınız.");
      return;
    }

    console.log(
      "İzlenenlere ekleme/çıkarma işlemi başlatıldı. Film ID:",
      movieId
    );

    // Mevcut izlenen filmler listesini kontrol et
    const isAlreadyWatched = watchedMovies.includes(movieId);

    try {
      if (isAlreadyWatched) {
        // Listeden çıkar
        const newWatchedMovies = watchedMovies.filter((id) => id !== movieId);

        // UI'da güncelleyelim
        setWatchedMovies(newWatchedMovies);

        console.log("İzlenenlerden çıkarılıyor:", movieId);

        try {
          // Veritabanından silme işlemi yap
          const response = await fetch(
            `http://localhost:3001/api/users/watched/${movieId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`,
              },
            }
          );

          console.log("Sunucu yanıt durumu:", response.status);

          if (!response.ok) {
            // Hata durumunda UI'ı geri al
            setWatchedMovies([...watchedMovies]);

            let errorMessage = "Filmler listeden çıkarılırken bir hata oluştu";

            try {
              const errorData = await response.json();
              console.error("API yanıt hatası:", errorData);
              errorMessage =
                errorData.message ||
                errorData.error ||
                "Filmler listeden çıkarılırken bir hata oluştu";
            } catch (jsonError) {
              console.error(
                "API yanıtı JSON olarak ayrıştırılamadı:",
                jsonError
              );
            }

            throw new Error(errorMessage);
          }

          console.log("Silme işlemi başarılı. Yanıt kodu:", response.status);
        } catch (apiError: any) {
          console.error("API isteği hatası:", apiError);
          // UI'ı geri al
          setWatchedMovies([...watchedMovies]);
          throw apiError; // Tekrar fırlat, ana catch bloğu yakalayacak
        }
      } else {
        // Listeye ekle
        const newWatchedMovies = [...watchedMovies, movieId];

        // UI'da güncelleyelim
        setWatchedMovies(newWatchedMovies);

        console.log("İzlenenlere ekleniyor:", movieId);

        try {
          const response = await fetch(
            `http://localhost:3001/api/users/watched`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${currentToken}`,
              },
              body: JSON.stringify({ movieId }),
            }
          );

          console.log("Sunucu yanıt durumu:", response.status);

          // Yanıtı kontrol et
          if (!response.ok) {
            // Hata durumunda UI'ı geri al
            setWatchedMovies([...watchedMovies]);

            let errorMessage = "İzlenen film eklenemedi";

            try {
              const errorData = await response.json();
              console.error("API yanıt hatası:", errorData);
              errorMessage =
                errorData.message ||
                errorData.error ||
                "İzlenen film eklenemedi";
            } catch (jsonError) {
              console.error(
                "API yanıtı JSON olarak ayrıştırılamadı:",
                jsonError
              );
            }

            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log("İzlenen film ekleme başarılı. Yanıt:", data);
        } catch (apiError: any) {
          console.error("API isteği hatası:", apiError);
          // UI'ı geri al
          setWatchedMovies(watchedMovies.filter((id) => id !== movieId));
          throw apiError; // Tekrar fırlat, ana catch bloğu yakalayacak
        }
      }
    } catch (error: any) {
      console.error("İzlenen film listesi güncellenirken hata:", error);

      // Hata durumunda UI'ı geri al - Bu kısma genelde düşmeyecek çünkü API catch bloğu UI'ı zaten güncelliyor
      if (isAlreadyWatched) {
        setWatchedMovies([...watchedMovies]); // Eski listeyi geri yükle
      } else {
        setWatchedMovies(watchedMovies.filter((id) => id !== movieId)); // İlave edilen ID'yi kaldır
      }

      // Kullanıcıya hata mesajı göster
      alert(
        "İşlem sırasında bir hata oluştu: " +
          (error.message || "Bilinmeyen hata")
      );
    }

    // Menüyü kapat
    setOpenMenu(null);
  };

  // Menüyü açma/kapama
  const toggleMenu = (e: React.MouseEvent, movieId: number) => {
    e.preventDefault(); // Link'in çalışmasını engelle
    e.stopPropagation(); // Event'in parent'lara ulaşmasını engelle

    setOpenMenu(openMenu === movieId ? null : movieId);
  };

  // Sayfa tıklaması ile menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Eğer tıklanan eleman menü veya menü butonu değilse menüyü kapat
      const target = e.target as HTMLElement;
      if (
        !target.closest(".dropdown-menu") &&
        !target.closest(".menu-button")
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Koleksiyon boş mu kontrol et - tüm olası durumları kontrol eder
  const isCollectionEmpty = (collection: any): boolean => {
    // Null veya undefined kontrolü
    if (collection === null || collection === undefined) {
      return true;
    }

    // Boş string kontrolü
    if (collection === "") {
      return true;
    }

    // Boş JSON string kontrolü: "{}" veya "[]"
    if (typeof collection === "string") {
      const trimmed = collection.trim();
      if (trimmed === "{}" || trimmed === "[]" || trimmed === "") {
        return true;
      }

      // JSON string içinde anlamlı veri var mı kontrol et
      try {
        const parsed = JSON.parse(trimmed);
        return (
          (Array.isArray(parsed) && parsed.length === 0) || // Boş array
          (typeof parsed === "object" &&
            parsed !== null &&
            Object.keys(parsed).length === 0) // Boş obje
        );
      } catch {
        // JSON parse hatası - geçerli bir JSON değil
        return false;
      }
    }

    // Obje kontrolü
    if (typeof collection === "object" && collection !== null) {
      // Boş obje veya boş array kontrolü
      if (Array.isArray(collection)) {
        return collection.length === 0;
      }
      return Object.keys(collection).length === 0;
    }

    // Hiçbir duruma uymuyorsa, değer var kabul et
    return false;
  };

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
          <FaStar key={`full_${i}`} className='text-yellow-400 w-4 h-4' />
        ))}
        {hasHalfStar && <FaStarHalf className='text-yellow-400 w-4 h-4' />}
        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty_${i}`} className='text-yellow-400 w-4 h-4' />
        ))}
      </div>
    );
  };

  // Tarih formatını daha kısa ve düzenli hale getirme
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);

      // Daha kısa format: "15 Oca 2021" gibi
      return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return "";
    }
  };

  // Türleri ayrıştırma
  const parseGenres = (genresString: string): string => {
    try {
      if (!genresString) return "";
      const genres = JSON.parse(genresString);
      if (Array.isArray(genres) && genres.length > 0) {
        return genres.map((genre: any) => genre.name).join(", ");
      }
      return "";
    } catch (error) {
      return "";
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Form submit olduğunda sayfanın yenilenmesini engelle
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Zaten input değiştiğinde otomatik arama yapılıyor,
    // burada sadece form submit'i engellemek yeterli
  };

  // Film kartlarını renderla
  const renderMovieCard = (movie: Movie) => (
    <div key={movie.id} className='relative group'>
      <Link
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
              <Image
                src={moviePosters[movie.id]}
                alt={movie.title}
                fill
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                style={{ objectFit: "cover" }}
                className='w-full h-full transition-opacity duration-300'
                unoptimized
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

          {/* İzlendi işareti - Eğer izlenmişse */}
          {watchedMovies.includes(movie.id) && (
            <div className='absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
              İzlendi
            </div>
          )}

          {/* İzleme listesinde işareti */}
          {watchlistMovies.includes(movie.id) &&
            !watchedMovies.includes(movie.id) && (
              <div className='absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
                İzleme Listemde
              </div>
            )}

          {/* Açılır menü */}
          {openMenu === movie.id && (
            <div className='dropdown-menu absolute top-12 right-2 w-48 bg-white rounded-md shadow-lg z-40 overflow-hidden'>
              <button
                onClick={(e) => toggleWatchedMovie(e, movie.id)}
                className='w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center'
              >
                {watchedMovies.includes(movie.id) ? (
                  <>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                    İzlenenlerden Çıkar
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    İzlediklerime Ekle
                  </>
                )}
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
            {getStarRating(movie.vote_average)}
            <span className='text-sm text-gray-600 ml-1'>
              ({movie.vote_average.toFixed(1)})
            </span>
          </div>

          {/* Tarih - yeni stilde */}
          <div className='text-sm text-gray-600 truncate'>
            <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block'>
              {formatDate(movie.release_date)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

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

  return (
    <div className='min-h-screen pb-16'>
      <div className='max-w-7xl mx-auto px-4 pt-16'>
        <div className='flex flex-col md:flex-row justify-between items-center mb-12'>
          <div className='flex flex-col mb-4 md:mb-0'>
            <h1 className='text-4xl font-bold text-white mb-2'>Tüm Filmler</h1>
            <div className='flex space-x-4 mt-2'>
              <Link
                href='/my-movies'
                className='text-green-400 hover:text-green-300 flex items-center'
              >
                <span className='bg-green-600 rounded-full w-4 h-4 mr-2 flex items-center justify-center text-xs'>
                  ✓
                </span>
                İzlediklerim
              </Link>
            </div>
          </div>

          {/* Arama formu */}
          <form onSubmit={handleSubmit} className='relative w-full md:w-96'>
            <input
              type='text'
              placeholder='Film adına göre ara...'
              value={searchTerm}
              onChange={handleSearch}
              className='w-full px-4 py-3 pl-10 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              ref={searchInputRef}
              autoFocus
            />
            <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            {contentLoading && (
              <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                <div className='animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent'></div>
              </div>
            )}
          </form>
        </div>

        {/* Film içeriği - Sadece filmler yüklenirken bu bölüm güncellenir */}
        <div className='movie-content-section'>
          {contentLoading ? (
            <div className='flex justify-center items-center py-20'>
              <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
              {movies && movies.length > 0 ? (
                movies.map((movie) => renderMovieCard(movie))
              ) : (
                <div className='col-span-full text-center py-10'>
                  <p className='text-white text-xl'>Film bulunamadı.</p>
                </div>
              )}
            </div>
          )}

          {/* Sayfalama */}
          {!contentLoading && movies.length > 0 && (
            <div className='flex justify-center items-center mt-12 space-x-2'>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded ${
                  currentPage === 1
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                &laquo; Önceki
              </button>

              <div className='text-white px-4 py-2'>
                Sayfa {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded ${
                  currentPage === totalPages
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Sonraki &raquo;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
