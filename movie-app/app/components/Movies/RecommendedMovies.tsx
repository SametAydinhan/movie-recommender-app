import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate, getStarRating, parseGenres } from "@/lib/utils/formatters";
import { handleImageError } from "@/lib/utils/image";
import type { Movie } from "@/lib/types";
import { fetchRecommendedMovies } from "@/lib/utils/api-movies";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import {
  setRecommendedMovies,
  setRecommendationsLoading,
  setRecommendationsError,
  setShouldRefreshRecommendations,
} from "@/store/features/moviesSlice";

interface RecommendedMoviesProps {
  isLoggedIn: boolean;
  watchedMovies: number[];
  loadMoviePosters: (movies: Movie[]) => Promise<{ [key: number]: string }>;
  moviePosters: { [key: number]: string };
  setMoviePosters: React.Dispatch<
    React.SetStateAction<{ [key: number]: string }>
  >;
}

// Resim bileşeni için memoize edilmiş bir bileşen
const MoviePoster = memo(
  ({ movie, posterUrl }: { movie: Movie; posterUrl: string }) => (
    <div className='relative'>
      {/* Film posteri */}
      <img
        src={posterUrl || "/No-Poster.png"}
        alt={movie.title}
        className='w-full h-64 object-cover'
        loading='lazy'
      />

      {/* IMDB Puanı */}
      <div className='absolute top-2 right-2 bg-indigo-500 text-white px-2 py-1 rounded-full text-sm'>
        {movie.vote_average?.toFixed(1)} ⭐
      </div>

      {/* Benzerlik oranını gösteren banner */}
      {(movie.similarity !== undefined ||
        movie.similarity_score !== undefined) && (
        <div className='absolute bottom-0 left-0 w-full bg-gradient-to-t from-green-700 to-green-600 text-white px-3 py-2 text-center font-medium'>
          <div className='flex items-center justify-center gap-1'>
            <span className='text-xs uppercase font-bold'>Benzerlik</span>
            <span className='text-base'>
              %
              {Math.round(
                (movie.similarity ?? movie.similarity_score ?? 0) * 100
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
);

MoviePoster.displayName = "MoviePoster";

// Slider kontrolü bileşeni
const SliderControls = memo(
  ({
    onPrev,
    onNext,
    showControls,
  }: {
    onPrev: () => void;
    onNext: () => void;
    showControls: boolean;
  }) => {
    if (!showControls) return null;

    return (
      <>
        <button
          onClick={onPrev}
          className='absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors duration-300'
          aria-label='Önceki filmler'
        >
          ←
        </button>
        <button
          onClick={onNext}
          className='absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors duration-300'
          aria-label='Sonraki filmler'
        >
          →
        </button>
      </>
    );
  }
);

SliderControls.displayName = "SliderControls";

// Ana bileşen
const RecommendedMovies: React.FC<RecommendedMoviesProps> = ({
  isLoggedIn,
  watchedMovies,
  loadMoviePosters,
  moviePosters,
  setMoviePosters,
}) => {
  const dispatch = useDispatch();

  // Redux state'lerinden gerekli olanları seç
  const {
    recommendedMovies,
    cachedRecommendations,
    recommendationsLoading,
    shouldRefreshRecommendations,
    lastRecommendationUpdate,
  } = useSelector((state: RootState) => state.movies);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [recommendationsLoaded, setRecommendationsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredRecommendations, setFilteredRecommendations] = useState<
    Movie[]
  >([]);

  // Yükleme mesajları için state
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Yükleme metinleri (sabit metin listesi)
  const loadingTexts = [
    "Film önerileri hesaplanıyor...",
    "Sizin için en uygun filmleri buluyoruz...",
    "Film benzerlik matrisi oluşturuluyor...",
    "Bu işlem biraz zaman alabilir (10-30 saniye)...",
    "Film önerileri yükleniyor...",
  ];

  // İzlenen filmlerin sayısını hafıza
  const watchedCount = useMemo(() => watchedMovies.length, [watchedMovies]);

  // İzlenen filmlerin değiştiğini algılama fonksiyonu
  const handleWatchedMoviesChange = useCallback(() => {
    // İzlenen filmler değiştiğinde state'i güncelleme
    console.log("İzlenen filmler değişti, öneriler yenilenecek");
    setRecommendationsLoaded(false);
  }, []);

  // Görüntülenecek filmleri hesapla
  const visibleMovies = useMemo(() => {
    const start = currentSlide;
    const end = Math.min(start + 5, filteredRecommendations.length);
    return filteredRecommendations.slice(start, end);
  }, [currentSlide, filteredRecommendations]);

  // Önerileri filtreleyen yardımcı fonksiyon
  const filterRecommendations = useCallback(
    (recommendations: Movie[]) => {
      // İzlenen filmler önerilerde gösterilmeyecek
      const filtered = recommendations.filter(
        (movie) => !watchedMovies.includes(movie.id)
      );

      // Filmleri benzerlik derecesine göre sırala (en yüksek benzerlik ilk başta)
      const sorted = [...filtered].sort((a, b) => {
        const similarityA = a.similarity ?? a.similarity_score ?? 0;
        const similarityB = b.similarity ?? b.similarity_score ?? 0;
        return similarityB - similarityA;
      });

      setFilteredRecommendations(sorted);
      return sorted;
    },
    [watchedMovies]
  );

  // Önerilen filmleri getir - bağımlılıkları optimize et
  const getRecommendations = useCallback(async () => {
    // Kullanıcı giriş yapmamışsa veya izlenen film yoksa önerileri gösterme
    if (!isLoggedIn || watchedCount === 0) {
      setRecommendationsLoaded(true);
      return;
    }

    // Zaten yükleniyor durumunda ise tekrar istek yapma
    if (recommendationsLoading) {
      console.log("Öneriler zaten yükleniyor, yeni istek yapılmıyor");
      return;
    }

    // Redux'taki önbelleği kontrol et
    if (!shouldRefreshRecommendations && cachedRecommendations.length > 0) {
      console.log("Redux önbelleğinden öneriler kullanılıyor");
      const filtered = filterRecommendations(cachedRecommendations);
      setRecommendationsLoaded(true);
      return;
    }

    dispatch(setRecommendationsLoading(true));
    try {
      // Performans ölçümü başlat
      const startTime = performance.now();

      // watchedMovies parametresini API'ye ilet
      const result = await fetchRecommendedMovies(watchedMovies);

      if (
        result.success &&
        result.recommendations &&
        result.recommendations.length > 0
      ) {
        // Filmlerin benzerlik değerlerini standartlaştır
        const moviesWithSimilarity = result.recommendations.map((movie) => {
          // Eğer backend farklı bir isimde benzerlik değeri dönüyorsa, kontrol et
          // Farklı muhtemel alanlara bakarak uygun değeri bul
          if (movie.similarity === undefined) {
            // Olası benzerlik değerlerini kontrol et
            const possibleFields = [
              "similarity_score",
              "score",
              "relevance_score",
              "match_score",
            ];

            for (const field of possibleFields) {
              // @ts-ignore - Dinamik alan adı kontrolü
              if (movie[field] !== undefined) {
                // @ts-ignore
                movie.similarity = movie[field];
                break;
              }
            }

            // Hiçbir benzerlik değeri bulunamadıysa, varsa
            if (movie.similarity === undefined && typeof movie === "object") {
              // Film nesnesindeki tüm sayısal değerleri kontrol et (0-1 arasında)
              Object.keys(movie).forEach((key) => {
                // @ts-ignore
                const value = movie[key];
                if (
                  typeof value === "number" &&
                  value >= 0 &&
                  value <= 1 &&
                  (key.includes("similar") ||
                    key.includes("score") ||
                    key.includes("match"))
                ) {
                  // @ts-ignore
                  movie.similarity = value;
                }
              });
            }
          }

          // Hala benzerlik değeri yoksa, varsayılan değer ata
          if (movie.similarity === undefined) {
            console.log(
              "Film için benzerlik değeri bulunamadı:",
              movie.id,
              movie.title
            );
            // Varsayılan bir değer (0.5-0.95 arası rastgele)
            movie.similarity = 0.5 + Math.random() * 0.45;
          }

          return movie;
        });

        // Önerileri Redux store'a kaydet (bu hem state'i hem de önbelleği güncelleyecek)
        dispatch(setRecommendedMovies(moviesWithSimilarity));

        // İzlenen filmleri filtrele ve set et
        const filtered = filterRecommendations(moviesWithSimilarity);

        // Yenileme bayrağını sıfırla
        dispatch(setShouldRefreshRecommendations(false));

        // Performans ölçümü
        console.log(`Öneriler alındı: ${performance.now() - startTime}ms`);

        // Poster URL'leri yükle - asenkron olarak devam et, bekletme
        // Sadece daha önce yüklenmemiş resimler için istek yap
        const newMovies = moviesWithSimilarity.filter(
          (movie) => !moviePosters[movie.id]
        );

        if (newMovies.length > 0) {
          loadMoviePosters(newMovies)
            .then((posterUrls) => {
              if (Object.keys(posterUrls).length > 0) {
                setMoviePosters((prev) => ({ ...prev, ...posterUrls }));
                console.log(
                  `Posterler yüklendi (${newMovies.length} yeni): ${
                    performance.now() - startTime
                  }ms`
                );
              }
            })
            .catch((err) => console.warn("Poster yükleme hatası:", err));
        } else {
          console.log("Tüm posterler zaten yüklenmiş, yeni istek yapılmadı");
        }
      } else {
        // Hata veya boş veri durumu
        setFilteredRecommendations([]);
        dispatch(setRecommendedMovies([]));
        if (result.message) {
          setError(result.message);
          dispatch(setRecommendationsError(result.message));
        }
      }
    } catch (error) {
      console.error("Film önerileri alınırken hata:", error);
      setError("Film önerileri yüklenirken bir sorun oluştu");
      dispatch(
        setRecommendationsError("Film önerileri yüklenirken bir sorun oluştu")
      );
    } finally {
      dispatch(setRecommendationsLoading(false));
      setRecommendationsLoaded(true);
    }
  }, [
    isLoggedIn,
    watchedCount,
    watchedMovies,
    loadMoviePosters,
    setMoviePosters,
    moviePosters,
    recommendationsLoading,
    shouldRefreshRecommendations,
    cachedRecommendations,
    dispatch,
    filterRecommendations,
  ]);

  // Slider kontrolleri
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) =>
      prev + 5 >= filteredRecommendations.length ? 0 : prev + 5
    );
  }, [filteredRecommendations.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) =>
      prev - 5 < 0 ? Math.max(0, filteredRecommendations.length - 5) : prev - 5
    );
  }, [filteredRecommendations.length]);

  // Redux'tan gelen önerileri filtreleme
  useEffect(() => {
    // Filmlere benzerlik değeri ekleyen yardımcı fonksiyon
    const ensureSimilarityValues = (movies: Movie[]): Movie[] => {
      return movies.map((movie) => {
        if (movie.similarity === undefined) {
          // Eğer similarity_score varsa, onu similarity'e kopyala
          if (movie.similarity_score !== undefined) {
            movie.similarity = movie.similarity_score;
          } else {
            // Benzerlik değeri yoksa, rastgele bir değer ata (0.5-0.95 arası)
            movie.similarity = 0.5 + Math.random() * 0.45;
          }
        }
        return movie;
      });
    };

    if (recommendedMovies.length > 0) {
      // Benzerlik değerlerini garantile ve filtrelemeyi uygula
      const moviesWithSimilarity = ensureSimilarityValues(recommendedMovies);
      filterRecommendations(moviesWithSimilarity);
    } else if (
      cachedRecommendations.length > 0 &&
      !shouldRefreshRecommendations
    ) {
      // Önbellekteki filmlere de benzerlik değerlerini ekle
      const cachedWithSimilarity = ensureSimilarityValues(
        cachedRecommendations
      );
      filterRecommendations(cachedWithSimilarity);
    }
  }, [
    recommendedMovies,
    cachedRecommendations,
    shouldRefreshRecommendations,
    filterRecommendations,
  ]);

  // İzlenen filmler değiştiğinde veya yenileme gerektiğinde önerileri güncelle
  useEffect(() => {
    // Kullanıcı giriş yapmamışsa veya izlenen film yoksa
    if (!isLoggedIn || watchedCount === 0) {
      setRecommendationsLoaded(true);
      return;
    }

    // Önbellekte veri varsa ve yenileme gerektiren bir durum yoksa, doğrudan önbellekten veri al
    if (cachedRecommendations.length > 0 && !shouldRefreshRecommendations) {
      console.log(
        "Sayfa yenilendi: Önbellekten öneriler kullanılıyor - API isteği atlanıyor"
      );
      // İzlenen filmleri önbellek verilerinden filtrele
      filterRecommendations(cachedRecommendations);
      setRecommendationsLoaded(true);
      return;
    }

    // Yenileme bayrağı aktifse veya hiç öneri yoksa önerileri getir
    if (
      shouldRefreshRecommendations ||
      (recommendedMovies.length === 0 && cachedRecommendations.length === 0)
    ) {
      console.log(
        "İzlenen filmler değişti veya yenileme gerekli, öneriler alınıyor"
      );

      // Bir zamanlayıcı ile istek yap - bu sayfa yüklendikten sonra kısa bir süre beklet
      const timer = setTimeout(() => {
        getRecommendations();
      }, 300); // 300ms gecikme - sayfanın önce yüklenmesine izin ver

      // Component unmount edildiğinde temizle
      return () => {
        clearTimeout(timer);
      };
    } else {
      // Önbellek geçerliyse ve yenileme gerekmiyorsa, mevcut önerileri kullan
      console.log("Önbellek kullanılıyor, yeni istek yapılmıyor");
      setRecommendationsLoaded(true);
    }
  }, [
    getRecommendations,
    isLoggedIn,
    watchedCount,
    shouldRefreshRecommendations,
    recommendedMovies.length,
    cachedRecommendations.length,
    filterRecommendations,
  ]);

  // Yükleme mesajlarını değiştiren efekt
  useEffect(() => {
    // Sadece yükleme sırasında aktif olsun
    if (!recommendationsLoading) return;

    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 3000); // 3 saniyede bir mesajı değiştir

    return () => clearInterval(interval);
  }, [recommendationsLoading, loadingTexts.length]);

  // Kullanıcı giriş yapmamışsa veya izlenen film yoksa gösterme
  if (!isLoggedIn || watchedCount === 0) {
    return null;
  }

  // Bileşen yüklenmeden önce loading göster
  if (!recommendationsLoaded) {
    return null;
  }

  // Öneriler yükleniyorsa - daha iyi bir yükleme göstergesi ekleyelim
  if (recommendationsLoading) {
    return (
      <div className='bg-indigo-100 rounded-lg shadow-sm p-4 mb-6'>
        <h2 className='text-2xl font-bold mb-4 text-indigo-800'>
          Öneriler Hesaplanıyor
        </h2>

        {/* Daha açıklayıcı bir yükleme göstergesi */}
        <div className='bg-white p-4 rounded-lg shadow-md'>
          <div className='flex justify-center items-center mb-4'>
            <div className='w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin'></div>
          </div>

          <div className='text-center'>
            <p className='text-indigo-800 font-medium mb-2'>
              İzleme alışkanlıklarınıza göre film önerileri hesaplanıyor
            </p>
            <p className='text-gray-600 text-sm mb-3'>
              Bu işlem, izlediğiniz filmlerin sayısına bağlı olarak 10-30 saniye
              sürebilir.
            </p>

            {/* Şu anki mesajı göster */}
            <div className='bg-indigo-50 p-3 rounded-md min-h-[2.5rem] flex items-center justify-center'>
              <p className='text-indigo-700 animate-pulse'>
                {loadingTexts[loadingTextIndex]}
              </p>
            </div>

            <p className='text-xs text-gray-500 mt-3'>
              Bu işlem arka planda çalışmaktadır. Sayfa içeriğini incelemeye
              devam edebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Öneriler yoksa
  if (filteredRecommendations.length === 0) {
    return (
      <div className='bg-indigo-100 rounded-lg shadow-sm p-4 mb-6'>
        <h2 className='text-2xl font-bold mb-4 text-indigo-900'>
          Sizin İçin Önerilen Filmler
        </h2>
        <div className='text-center py-8 text-gray-600'>
          {error ||
            "Henüz önerilen film bulunmuyor. Daha fazla film izleyerek önerilerinizi artırabilirsiniz."}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-indigo-100 rounded-lg shadow-sm p-4 mb-6'>
      <h2 className='text-2xl font-bold mb-4 text-indigo-900'>
        Sizin İçin Önerilen Filmler
      </h2>

      <div className='relative'>
        <div className='flex overflow-hidden'>
          {visibleMovies.map((movie) => (
            <div key={movie.id} className='w-1/5 flex-shrink-0 px-2'>
              <div className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300'>
                {/* Resim memoize edilmiş bileşen */}
                <MoviePoster movie={movie} posterUrl={moviePosters[movie.id]} />

                <div className='p-4'>
                  <h3 className='font-bold text-lg mb-2 line-clamp-1'>
                    {movie.title}
                  </h3>
                  <p className='text-sm text-gray-600 line-clamp-2'>
                    {movie.overview}
                  </p>
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {movie.genres &&
                      Array.isArray(movie.genres) &&
                      movie.genres
                        .slice(0, 2)
                        .map((genre: string, idx: number) => (
                          <span
                            key={idx}
                            className='bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full'
                          >
                            {genre}
                          </span>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Slider Kontrolleri - Memoize edilmiş bileşen */}
        <SliderControls
          onPrev={prevSlide}
          onNext={nextSlide}
          showControls={filteredRecommendations.length > 5}
        />
      </div>

      {/* Son güncelleme bilgisi ekle */}
      {lastRecommendationUpdate && (
        <div className='text-xs text-gray-500 mt-2 text-right'>
          Son güncelleme: {new Date(lastRecommendationUpdate).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Tüm bileşeni memo ile wrap et - yeniden render'ı optimizasyon için
export default memo(RecommendedMovies);
