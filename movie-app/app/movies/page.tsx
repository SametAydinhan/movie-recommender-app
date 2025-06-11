"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/utils/auth";
import type { Movie } from "@/lib/types";
import { formatDate, getStarRating, parseGenres } from "@/lib/utils/formatters";
import { loadPosterImages, isCollectionEmpty } from "@/lib/utils/image";
import { fetchMovies, toggleWatchedMovie } from "@/lib/utils/api-movies";
import { MoviesHeader, MovieList, Pagination } from "@/app/components/Movies";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  fetchWatchedMoviesAsync,
  addToWatched,
  removeFromWatched,
  setWatchlistMovies,
} from "@/store/features/moviesSlice";

export default function Movies() {
  const dispatch = useDispatch<AppDispatch>();
  // Redux'tan izlenen filmler ve izleme listesi
  const { watchedMovies, watchlistMovies } = useSelector(
    (state: RootState) => state.movies
  );

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Arama giriş alanı için ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Varsayılan resimler kütüphanesi
  const defaultImages = [
    "/movie-placeholder-1.jpg",
    "/movie-placeholder-2.jpg",
    "/movie-placeholder-3.jpg",
    "/movie-placeholder-4.jpg",
    "/movie-placeholder-5.jpg",
  ];

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
        // Giriş yapmamış kullanıcıları ana sayfaya yönlendir
        router.push("/");
      }
    };

    checkAuth();
  }, [router]);

  // Sayfa yüklendiğinde Redux'taki filmler güncelleme
  useEffect(() => {
    // Kullanıcı giriş yapmışsa API'den izlenen filmleri getir
    if (isLoggedIn) {
      dispatch(fetchWatchedMoviesAsync());
    }

    // İzleme listesi filmlerini getir (localStorage'dan)
    const savedWatchlistMovies = localStorage.getItem("watchlistMovies");
    if (savedWatchlistMovies) {
      try {
        const parsedWatchlist = JSON.parse(savedWatchlistMovies);
        dispatch(setWatchlistMovies(parsedWatchlist));
      } catch (error) {
        console.error("İzleme listesi yüklenirken hata:", error);
        localStorage.removeItem("watchlistMovies");
      }
    }
  }, [dispatch, isLoggedIn]);

  // İzleme listesi güncellendiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("watchlistMovies", JSON.stringify(watchlistMovies));
  }, [watchlistMovies]);

  // Sayfanın her yüklenmesinde ve arama terimi/sayfa değişikliğinde filmleri getir
  useEffect(() => {
    if (isLoggedIn) {
      getMovies();
    }
  }, [isLoggedIn, currentPage, searchTerm]);

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

  // Filmleri getir
  const getMovies = async () => {
    setContentLoading(true);
    try {
      const result = await fetchMovies(currentPage, searchTerm);

      if (result.error) {
        setError(result.error || "Filmler yüklenemedi");
        setMovies([]);
      } else {
        setMovies(result.movies);
        setTotalPages(result.pagination?.totalPages || 1);

        // Posterler için yükleme durumlarını ayarla
        const loadingStates: { [key: number]: boolean } = {};
        result.movies.forEach((movie) => {
          loadingStates[movie.id] = true;
        });
        setIsImageLoading(loadingStates);

        // Posterleri yükle
        const posterUrls = await loadMoviePosters(result.movies);
        setMoviePosters(posterUrls);
      }
    } catch (error: any) {
      console.error("Filmler getirme hatası:", error);
      setError(error.message || "Filmler yüklenemedi");
      setMovies([]);
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  };

  // Film posterlerini yükle
  const loadMoviePosters = async (movies: Movie[]) => {
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
        if (movie.tmdbId && movie.tmdbId !== "null" && movie.tmdbId !== null) {
          console.log(`Film ${movie.id} için TMDB ID bulundu: ${movie.tmdbId}`);
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

          // Resim URL'si oluştur
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
            // Koleksiyon var ama poster path yok
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
  };

  // Film izleme listesine ekleme/çıkarma
  const handleWatchedToggle = async (e: React.MouseEvent, movieId: number) => {
    e.preventDefault(); // Link'in çalışmasını engelle
    e.stopPropagation(); // Event'in parent'lara ulaşmasını engelle

    // Kullanıcı giriş yapmış mı kontrol et
    if (!isLoggedIn) {
      alert("Bu işlemi yapabilmek için giriş yapmalısınız.");
      return;
    }

    // Menüyü kapat
    setOpenMenu(null);

    console.log(
      "İzlenenlere ekleme/çıkarma işlemi başlatıldı. Film ID:",
      movieId
    );

    // Mevcut izlenen filmler listesini kontrol et
    const isAlreadyWatched = watchedMovies.includes(movieId);

    try {
      // Önce Redux'u güncelle (optimistik güncelleme)
      if (isAlreadyWatched) {
        // Redux state'ini güncelle - listeden çıkar
        dispatch(removeFromWatched(movieId));
      } else {
        // Redux state'ini güncelle - listeye ekle
        dispatch(addToWatched(movieId));
      }

      // API isteğini yap
      const result = await toggleWatchedMovie(movieId, isAlreadyWatched);

      if (!result.success) {
        // API işlemi başarısız olursa, Redux değişikliklerini geri al
        if (isAlreadyWatched) {
          dispatch(addToWatched(movieId));
        } else {
          dispatch(removeFromWatched(movieId));
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

  // İzleme listesine ekleme/çıkarma için yeni fonksiyon
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

  // Arama işlemi
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Form submit olduğunda sayfanın yenilenmesini engelle
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        {/* Başlık ve Arama Formu */}
        <MoviesHeader
          searchTerm={searchTerm}
          onSearch={handleSearch}
          onSubmit={handleSubmit}
          searchInputRef={searchInputRef}
          contentLoading={contentLoading}
        />

        {/* Film İçeriği - Ana film içeriği */}
        <div className='movie-content-section mb-8'>
          <MovieList
            movies={movies}
            isLoading={contentLoading}
            posters={moviePosters}
            imageLoadingStates={isImageLoading}
            watchedMovies={watchedMovies}
            watchlistMovies={watchlistMovies}
            openMenu={openMenu}
            onToggleMenu={toggleMenu}
            onWatchedToggle={handleWatchedToggle}
            onAddToWatchlist={handleAddToWatchlist}
          />

          {/* Sayfalama */}
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
