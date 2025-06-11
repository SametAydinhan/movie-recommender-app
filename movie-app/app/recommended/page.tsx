"use client";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/utils/auth";
import type { Movie } from "@/lib/types";
import { formatDate, getStarRating, parseGenres } from "@/lib/utils/formatters";
import { loadPosterImages, isCollectionEmpty } from "@/lib/utils/image";
import {
  fetchRecommendedMovies,
  toggleWatchedMovie,
} from "@/lib/utils/api-movies";
import { MovieList, Pagination } from "@/app/components/Movies";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  fetchWatchedMoviesAsync,
  addToWatched,
  removeFromWatched,
  setWatchlistMovies,
  setShouldRefreshRecommendations,
  setRecommendedMovies,
} from "@/store/features/moviesSlice";
import {
  FaSync,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/button";
import { ReloadIcon } from "@/app/components/icons/ReloadIcon";

export default function RecommendedMovies() {
  const dispatch = useDispatch<AppDispatch>();
  // Redux'tan izlenen filmler ve izleme listesi
  const {
    watchedMovies,
    watchlistMovies,
    shouldRefreshRecommendations,
    recommendedMovies: reduxRecommendedMovies,
    cachedRecommendations,
  } = useSelector((state: RootState) => state.movies);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Yenileme durumu için yeni state
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isImageLoading, setIsImageLoading] = useState<{
    [key: number]: boolean;
  }>({});

  // Açık menüyü izleme için state
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  // Filmler için posterler
  const [moviePosters, setMoviePosters] = useState<{ [key: number]: string }>(
    {}
  );

  // Kullanıcının oturum durumunu kontrol et
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const router = useRouter();

  // Varsayılan resimler kütüphanesi
  const defaultImages = [
    "/movie-placeholder-1.jpg",
    "/movie-placeholder-2.jpg",
    "/movie-placeholder-3.jpg",
    "/movie-placeholder-4.jpg",
    "/movie-placeholder-5.jpg",
  ];

  // İpucu dropdown durumu
  const [isTipOpen, setIsTipOpen] = useState(false);

  // Sayfa yüklendiğinde veri yükleme kontrolü
  const [dataInitialized, setDataInitialized] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Film posterlerini yükle
  const loadMoviePosters = useCallback(
    async (movies: Movie[]) => {
      // Her film için resim URL'si oluştur
      const posterUrls: { [key: number]: string } = {};

      for (const movie of movies) {
        try {
          // Film ID kontrolü
          if (!movie || !movie.id) {
            console.error("Geçersiz film verisi:", movie);
            continue;
          }

          // Backend'den gelen poster_url varsa onu kullan
          if (movie.poster_url) {
            console.log(
              `Film ${movie.id} için backend'den gelen poster URL kullanılıyor: ${movie.poster_url}`
            );
            posterUrls[movie.id] = movie.poster_url;
            setIsImageLoading((prev) => ({ ...prev, [movie.id]: false }));
            continue; // Diğer kontrolleri atla
          }

          // Koleksiyon kontrolü
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

      return posterUrls;
    },
    [defaultImages]
  );

  // Film önerilerini yenileme yardımcı fonksiyonu
  const refreshRecommendations = useCallback(() => {
    if (!isLoggedIn) {
      return; // Kullanıcı giriş yapmamışsa işlemi durdur
    }

    // Eğer önbellekte veriler varsa ve shouldRefreshRecommendations bayrağı aktif değilse
    // önbellekten verileri kullan
    if (cachedRecommendations.length > 0 && !shouldRefreshRecommendations) {
      console.log(
        "Yenileme: Önbellekten öneriler kullanılıyor - API isteği atlanıyor"
      );

      // Benzerlik değerlerini debug için konsola yazdır
      cachedRecommendations.forEach((movie) => {
        console.log(
          `Önbellekten yüklenen film ${movie.id}: ${movie.title}, Benzerlik: ${(
            movie.similarity ??
            movie.similarity_score ??
            0
          ).toFixed(4)}`
        );
      });

      // Filtrele ve güncelle
      setMovies(
        cachedRecommendations.filter(
          (movie) => !watchedMovies.includes(movie.id)
        )
      );
      setTotalPages(Math.ceil(cachedRecommendations.length / 5));
      setLoading(false);
      setContentLoading(false);
      return;
    }

    setLoading(true);
    setContentLoading(true);
    setError(""); // Boş string kullan
    console.log("Öneriler yenileniyor...");

    // UI için yükleme durumunu biraz koruyalım
    const yenilemeBaslangic = Date.now();
    const minimumYuklemeSuresi = 1000; // En az 1 saniye yükleme göster

    // Önce önbelleği temizle
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("recommendationsCache");
        console.log("Önbellek temizlendi");
      }
    } catch (e) {
      console.warn("Önbellek temizlenirken hata:", e);
    }

    // Redux'ta yenileme ihtiyacını ayarla
    dispatch(setShouldRefreshRecommendations(true));

    const apiCall = async () => {
      try {
        // Önbelleği temizleyerek ve forceRefresh ile yeni öneriler iste
        const response = await fetchRecommendedMovies(watchedMovies, true);

        // Toplam geçen süreyi hesapla
        const gecenSure = Date.now() - yenilemeBaslangic;

        // Eğer minimum yükleme süresinden az geçtiyse, kalan süre kadar bekle
        if (gecenSure < minimumYuklemeSuresi) {
          await new Promise((resolve) =>
            setTimeout(resolve, minimumYuklemeSuresi - gecenSure)
          );
        }

        if (response.success && response.recommendations) {
          // Yanıttan gelen tüm filmlerin benzerlik değerlerini konsolda göster - Debug için
          response.recommendations.forEach((movie) => {
            console.log(
              `API'den gelen film ${movie.id}: ${
                movie.title
              }, similarity_score: ${
                movie.similarity_score?.toFixed(4) || "yok"
              }, similarity: ${movie.similarity?.toFixed(4) || "yok"}`
            );
          });

          // Filmlerin benzerlik değerlerini standartlaştır
          const moviesWithSimilarity = response.recommendations.map((movie) => {
            // Backend'den gelen similarity_score değerini doğrudan kullan
            if (movie.similarity_score !== undefined) {
              movie.similarity = movie.similarity_score;

              // Konsola değerleri yazdır (debug için)
              console.log(
                `Film ${movie.id}: ${
                  movie.title
                }, Benzerlik: ${movie.similarity_score.toFixed(4)}`
              );
            } else if (movie.similarity === undefined) {
              // Benzerlik değeri yoksa, oy puanına göre bir değer hesapla
              const voteBasedSimilarity = movie.vote_average
                ? 0.3 + (movie.vote_average / 10) * 0.4
                : 0.5;

              movie.similarity = voteBasedSimilarity;
              console.log(
                `Film ${movie.id}: ${
                  movie.title
                }, Varsayılan benzerlik: ${voteBasedSimilarity.toFixed(4)}`
              );
            }

            return movie;
          });

          // Güncellenmiş benzerlik değerlerini son kez kontrol et
          moviesWithSimilarity.forEach((movie) => {
            console.log(
              `Son işlenmiş film ${movie.id}: ${movie.title}, Benzerlik: ${(
                movie.similarity ??
                movie.similarity_score ??
                0
              ).toFixed(4)}`
            );
          });

          // Redux store'a önerileri kaydet - standarlaştırılmış benzerlik değerleriyle
          dispatch(setRecommendedMovies(moviesWithSimilarity));

          // Filmleri benzerlik oranına göre sıralayarak lokal state'e kaydet
          const sortedByRelevance = [...moviesWithSimilarity].sort((a, b) => {
            const similarityA = a.similarity ?? a.similarity_score ?? 0;
            const similarityB = b.similarity ?? b.similarity_score ?? 0;
            return similarityB - similarityA;
          });

          // Aynı zamanda lokal state'e de kaydet
          setMovies(sortedByRelevance);
          console.log(
            `${response.recommendations.length} adet film önerisi alındı ve benzerlik oranlarına göre sıralandı`
          );

          // Toplam sayfa sayısını güncelle - Her sayfada 5 film gösterilecek
          setTotalPages(Math.ceil(response.recommendations.length / 5));

          // Eğer film varsa poster bilgilerini de yükle
          if (response.recommendations.length > 0) {
            // Posterler için yükleme durumlarını ayarla
            const loadingStates: { [key: number]: boolean } = {};
            response.recommendations.forEach((movie) => {
              loadingStates[movie.id] = true;
            });
            setIsImageLoading(loadingStates);

            // Posterleri yükle
            const posterUrls = await loadMoviePosters(response.recommendations);
            setMoviePosters(posterUrls);
          }

          if (response.recommendations.length === 0 && response.message) {
            setError(response.message);
          }
        } else if (response.message) {
          setError(response.message);
        }
      } catch (error) {
        console.error("Film önerileri alınırken hata:", error);
        setError("Film önerileri alınamadı. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setLoading(false);
        setContentLoading(false);
        setRefreshing(false);
        // Yenileme işlemi tamamlandı
        dispatch(setShouldRefreshRecommendations(false));
      }
    };

    // API isteğini başlat
    apiCall();
  }, [
    isLoggedIn,
    watchedMovies,
    dispatch,
    loadMoviePosters,
    cachedRecommendations,
    shouldRefreshRecommendations,
  ]);

  // Sayfa yüklendiğinde tek bir etki ile tüm veri yükleme işlemlerini yönet
  useEffect(() => {
    // Veriler zaten yüklendiyse tekrar yükleme
    if (dataInitialized) return;

    const initializeData = async () => {
      // Kullanıcı giriş yapmış mı kontrol et
      const token = getAuthToken();
      if (!token) {
        console.log("Kullanıcı giriş yapmamış, ana sayfaya yönlendiriliyor");
        setIsLoggedIn(false);
        router.push("/");
        return;
      }

      // Kullanıcı giriş yapmış
      setToken(token);
      setIsLoggedIn(true);
      setLoading(true);

      console.log("Kullanıcı oturumu doğrulandı, veriler yükleniyor...");

      try {
        // Önce localStorage'dan verileri yükle (hızlı başlangıç için)
        let localWatchedMovies: number[] = [];
        try {
          const savedWatchedMovies = localStorage.getItem("watchedMovies");
          if (savedWatchedMovies) {
            localWatchedMovies = JSON.parse(savedWatchedMovies);
            if (
              Array.isArray(localWatchedMovies) &&
              localWatchedMovies.length > 0
            ) {
              console.log(
                `localStorage'dan ${localWatchedMovies.length} izlenen film yüklendi`
              );
              dispatch({
                type: "movies/setWatchedMovies",
                payload: localWatchedMovies,
              });
            }
          }

          const savedWatchlistMovies = localStorage.getItem("watchlistMovies");
          if (savedWatchlistMovies) {
            const parsedWatchlist = JSON.parse(savedWatchlistMovies);
            dispatch(setWatchlistMovies(parsedWatchlist));
          }
        } catch (error) {
          console.error("localStorage'dan veriler yüklenirken hata:", error);
        }

        // Yalnızca bir kez API'den izlenen filmleri getir
        const watchedResponse = await dispatch(fetchWatchedMoviesAsync());
        const hasWatchedMovies =
          watchedResponse.payload &&
          Array.isArray(watchedResponse.payload) &&
          watchedResponse.payload.length > 0;

        if (hasWatchedMovies) {
          console.log(
            `API'den ${
              (watchedResponse.payload as number[]).length
            } izlenen film alındı`
          );
        } else if (localWatchedMovies.length === 0) {
          setLoading(false);
          setError("Öneri yapılabilmesi için daha fazla film izlemelisiniz.");
          setDataInitialized(true);
          return;
        }

        // Verileri başlatma işlemi tamamlandı
        setDataInitialized(true);
      } catch (error) {
        console.error("Veri başlatma sırasında hata:", error);
        setError("Veri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
      } finally {
        setDataInitialized(true);
      }
    };

    initializeData();
  }, [router, dispatch, dataInitialized]);

  // İzlenen filmler değiştiğinde ve veriler başlatıldığında önerileri güncelle
  useEffect(() => {
    if (
      dataInitialized &&
      isLoggedIn &&
      watchedMovies.length > 0 &&
      !initialLoadComplete
    ) {
      // Önbellekte öneri varsa ve yenileme gerekli değilse, doğrudan mevcut önbellek kullanılsın
      if (cachedRecommendations.length > 0 && !shouldRefreshRecommendations) {
        console.log("İlk yükleme: Redux önbelleğinden öneriler kullanılıyor");
        setMovies(
          cachedRecommendations.filter(
            (movie) => !watchedMovies.includes(movie.id)
          )
        );
        setTotalPages(Math.ceil(cachedRecommendations.length / 5));
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }

      console.log("İzlenen filmler değişti, öneriler yükleniyor...");
      refreshRecommendations();
      setInitialLoadComplete(true);
    }
  }, [
    dataInitialized,
    isLoggedIn,
    watchedMovies,
    refreshRecommendations,
    initialLoadComplete,
    cachedRecommendations,
    shouldRefreshRecommendations,
  ]);

  // İzleme listesi güncellendiğinde localStorage'a kaydet
  useEffect(() => {
    if (watchlistMovies.length > 0) {
      localStorage.setItem("watchlistMovies", JSON.stringify(watchlistMovies));
    }
  }, [watchlistMovies]);

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

  // İzlenen film eklendiğinde veya kaldırıldığında
  const handleWatchedToggle = async (e: React.MouseEvent, movieId: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Menüyü kapat
    setOpenMenu(null);

    // Zaten izleniyor mu kontrol et
    const isAlreadyWatched = watchedMovies.includes(movieId);

    try {
      const result = await toggleWatchedMovie(movieId, isAlreadyWatched);

      if (result.success) {
        // Redux üzerinden güncelle
        if (isAlreadyWatched) {
          dispatch(removeFromWatched(movieId));
        } else {
          dispatch(addToWatched(movieId));
        }

        // Bu film önerilerde gösterilmemeli, listeden çıkar
        setMovies((prev) => prev.filter((movie) => movie.id !== movieId));

        // Öneri sisteminin yenilenmesi gerektiğini bildir
        dispatch(setShouldRefreshRecommendations(true));

        // Başarı mesajı göster
        console.log(result.message);
      }
    } catch (error) {
      console.error("İzleme durumu değiştirilirken hata:", error);
    }
  };

  // İzleme listesine ekleme/çıkarma için fonksiyon
  const handleAddToWatchlist = (e: React.MouseEvent, movieId: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Menüyü kapat
    setOpenMenu(null);

    // Watchlist'te olup olmadığını kontrol et
    const isInWatchlist = watchlistMovies.includes(movieId);

    // Redux'ta watchlist'i güncelle
    if (isInWatchlist) {
      // Dispatch remove from watchlist
      dispatch({ type: "movies/removeFromWatchlist", payload: movieId });
    } else {
      // Dispatch add to watchlist
      dispatch({ type: "movies/addToWatchlist", payload: movieId });
    }

    // Başarı mesajı göster
    alert(
      isInWatchlist
        ? "Film izleme listenizden çıkarıldı"
        : "Film izleme listenize eklendi"
    );

    // Yenileme ve yükleme durumunu başlat
    setRefreshing(true);
    setContentLoading(true);

    // Kısa bir gecikme ile önerileri yenile (önbelleği atla)
    setTimeout(() => {
      refreshRecommendations();
    }, 300);
  };

  // Menüyü açma/kapama
  const toggleMenu = (e: React.MouseEvent, movieId: number) => {
    e.preventDefault(); // Link'in çalışmasını engelle
    e.stopPropagation(); // Event'in parent'lara ulaşmasını engelle
    setOpenMenu(openMenu === movieId ? null : movieId);
  };

  // Sayfa değiştirme işlemi
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Gösterilecek filmlerin hesaplanması (sayfalama)
  const displayedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * 5;
    const endIndex = startIndex + 5;
    return movies.slice(startIndex, endIndex);
  }, [movies, currentPage]);

  // Redux'taki öneriler değiştiğinde ve yerel state boşsa, önerileri al
  useEffect(() => {
    if (
      !loading &&
      movies.length === 0 &&
      (reduxRecommendedMovies.length > 0 || cachedRecommendations.length > 0)
    ) {
      // Filmler için benzerlik değerlerini standartlaştır
      const ensureSimilarityValues = (movies: Movie[]): Movie[] => {
        return movies.map((movie) => {
          // Eğer backend'den dönen bir benzerlik değeri varsa (similarity_score), bunu kullan
          if (movie.similarity_score !== undefined) {
            movie.similarity = movie.similarity_score;

            // Konsola değerleri yazdır (debug amaçlı, sonra kaldırılabilir)
            console.log(
              `Film: ${
                movie.title
              }, Benzerlik: ${movie.similarity_score.toFixed(4)}`
            );
          } else if (movie.similarity === undefined) {
            // Hiç benzerlik değeri yoksa, varsayılan değer yerine daha anlamlı bir değer ata
            // Oy ortalamasına dayalı basit bir benzerlik değeri (0.3-0.7 arası)
            const voteBasedSimilarity = movie.vote_average
              ? 0.3 + (movie.vote_average / 10) * 0.4
              : 0.5;

            movie.similarity = voteBasedSimilarity;
            console.log(
              `Film: ${
                movie.title
              }, Varsayılan benzerlik: ${voteBasedSimilarity.toFixed(4)}`
            );
          }

          return movie;
        });
      };

      // Redux'taki verileri normalize et ve benzerlik derecesine göre sırala
      if (reduxRecommendedMovies.length > 0) {
        console.log("Redux'taki öneriler yerel state'e yükleniyor");
        const normalizedMovies = ensureSimilarityValues(reduxRecommendedMovies);

        // Benzerlik oranına göre sırala
        const sortedMovies = [...normalizedMovies].sort((a, b) => {
          const similarityA = a.similarity ?? a.similarity_score ?? 0;
          const similarityB = b.similarity ?? b.similarity_score ?? 0;
          return similarityB - similarityA;
        });

        setMovies(sortedMovies);
        setTotalPages(Math.ceil(sortedMovies.length / 5));
      } else if (
        cachedRecommendations.length > 0 &&
        !shouldRefreshRecommendations
      ) {
        console.log("Redux'taki önbellek yerel state'e yükleniyor");

        const normalizedCache = ensureSimilarityValues(cachedRecommendations);

        // Benzerlik oranına göre sırala
        const sortedCache = [...normalizedCache].sort((a, b) => {
          const similarityA = a.similarity ?? a.similarity_score ?? 0;
          const similarityB = b.similarity ?? b.similarity_score ?? 0;
          return similarityB - similarityA;
        });

        setMovies(sortedCache);
        setTotalPages(Math.ceil(sortedCache.length / 5));
      }
    }
  }, [
    reduxRecommendedMovies,
    cachedRecommendations,
    movies.length,
    loading,
    shouldRefreshRecommendations,
  ]);

  if (error) {
    return (
      <div className='min-h-screen pb-16 bg-black'>
        <div className='max-w-7xl mx-auto px-4 py-16'>
          <div className='bg-gray-800 text-center p-6 rounded-lg shadow-lg border border-gray-700'>
            <h2 className='text-2xl font-bold mb-4 text-white'>
              Önerilen Filmler
            </h2>
            <div className='text-gray-300 bg-gray-900 p-6 rounded-md'>
              <p>{error}</p>
              {error.includes("daha fazla film") && (
                <div className='mt-6'>
                  <button
                    onClick={() => router.push("/movies")}
                    className='bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition-colors'
                  >
                    Filmlere Git
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen pb-16 bg-black'>
      <div className='max-w-7xl mx-auto px-4 pt-16'>
        <div className='mb-8 flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold text-white mb-2'>
              Sizin İçin Önerilen Filmler
            </h1>
            <p className='text-gray-400'>
              İzleme alışkanlıklarınıza göre özel olarak seçilen filmler
            </p>
          </div>
          <Button
            onClick={refreshRecommendations}
            variant='outline'
            className='ml-4 px-4 py-2 h-auto'
            disabled={loading || watchedMovies.length === 0}
          >
            {loading ? (
              <div className='flex items-center justify-center space-x-2'>
                <ReloadIcon className='h-4 w-4 animate-spin mr-2' />
                <span>Yükleniyor...</span>
              </div>
            ) : (
              <div className='flex items-center justify-center space-x-2'>
                <ReloadIcon className='h-4 w-4 mr-2' />
                <span>Önerileri Yenile</span>
              </div>
            )}
          </Button>
        </div>

        <div className='mb-6'>
          <button
            onClick={() => setIsTipOpen(!isTipOpen)}
            className='flex items-center gap-2 text-gray-300 bg-purple-900/20 border border-purple-900 rounded-lg py-2 px-3 w-full'
          >
            <FaInfoCircle className='text-purple-400' />
            <span className='text-sm font-medium'>Öneriler Hakkında Bilgi</span>
            {isTipOpen ? (
              <FaChevronUp className='ml-auto text-gray-400' />
            ) : (
              <FaChevronDown className='ml-auto text-gray-400' />
            )}
          </button>

          {isTipOpen && (
            <div className='bg-purple-900/20 border-l border-r border-b border-purple-900 rounded-b-lg p-3 text-sm text-gray-300 transition-all'>
              <p>
                Öneriler sunucuda hesaplanıp önbelleğe alınır. İzlediğiniz
                filmler değiştiğinde veya farklı öneriler görmek istediğinizde
                "Önerileri Yenile" butonunu kullanabilirsiniz. Öneri sistemi,
                izleme alışkanlıklarınıza göre sizin beğenebileceğiniz filmleri
                tahmin eder ve her sayfada 5 film olmak üzere toplam 25 film
                önerisi sunar.
              </p>
            </div>
          )}
        </div>

        {/* Film İçeriği */}
        <div className='movie-content-section mb-8'>
          {refreshing || contentLoading ? (
            <div className='flex flex-col justify-center items-center py-32'>
              <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4'></div>
              <p className='text-purple-300 text-lg font-medium'>
                Sizin için film önerileri hazırlanıyor...
              </p>
              <p className='text-gray-400 text-sm mt-2'>
                Bu işlem 1-2 dakika sürebilir. Lütfen bekleyin.
              </p>
              <div className='mt-6 w-64 bg-gray-800 rounded-full h-2.5'>
                <div className='bg-purple-600 h-2.5 rounded-full animate-pulse'></div>
              </div>
              <p className='text-gray-500 text-xs mt-2'>
                Film önerileri, izleme alışkanlıklarınız analiz edilerek
                hesaplanıyor
              </p>
            </div>
          ) : (
            <>
              {movies && movies.length > 0 ? (
                <>
                  <MovieList
                    movies={displayedMovies}
                    isLoading={false}
                    posters={moviePosters}
                    imageLoadingStates={isImageLoading}
                    watchedMovies={watchedMovies}
                    watchlistMovies={watchlistMovies}
                    openMenu={openMenu}
                    onToggleMenu={toggleMenu}
                    onWatchedToggle={handleWatchedToggle}
                    onAddToWatchlist={handleAddToWatchlist}
                    showSimilarity={true}
                  />

                  {/* Sayfalama - 25 film için gerekli */}
                  {movies.length > 0 && totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <div className='flex flex-col justify-center items-center py-16 bg-gray-900/30 rounded-xl'>
                  <FaInfoCircle className='text-gray-500 text-4xl mb-4' />
                  <p className='text-gray-400 text-lg font-medium'>
                    Film bulunamadı
                  </p>
                  <p className='text-gray-500 text-sm mt-2'>
                    Öneri yapabilmemiz için daha fazla film izleyin veya
                    önerileri yenileyin
                  </p>
                  <Button
                    onClick={refreshRecommendations}
                    variant='outline'
                    className='mt-6 px-4 py-2'
                  >
                    <ReloadIcon className='h-4 w-4 mr-2' />
                    <span>Önerileri Yenile</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
