import { Movie } from "@/lib/types";

interface Movie {
  id: number;
  poster_path: string;
  [key: string]: any;
}

/**
 * Resim URL'si oluşturan yardımcı fonksiyon
 * @param posterPath Poster yolu
 * @returns Tam URL
 */
export const getPosterUrl = (posterPath: string): string => {
  if (!posterPath) return "/no-poster.png";

  if (posterPath.startsWith("http")) {
    return posterPath;
  }

  return posterPath.startsWith("/")
    ? `https://image.tmdb.org/t/p/w500${posterPath}`
    : `https://image.tmdb.org/t/p/w500/${posterPath}`;
};

/**
 * Bir koleksiyonun boş olup olmadığını kontrol eder
 *
 * @param collection Kontrol edilecek koleksiyon/obje/dizi vb.
 * @returns Koleksiyon boşsa true, değilse false
 */
export const isCollectionEmpty = (collection: any): boolean => {
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

/**
 * Film posteri için URL'leri ve yükleme durumlarını hazırlar
 *
 * @param movies Film listesi
 * @param setIsImageLoading Resim yükleme durumunu güncelleyen fonksiyon
 * @returns Poster URL'lerini içeren bir obje
 */
export const loadPosterImages = async (
  movies: Movie[],
  defaultImages: string[] = [
    "/movie-placeholder-1.jpg",
    "/movie-placeholder-2.jpg",
    "/movie-placeholder-3.jpg",
    "/movie-placeholder-4.jpg",
    "/movie-placeholder-5.jpg",
  ]
): Promise<{ [key: number]: string }> => {
  // Her film için resim URL'si oluştur
  const posterUrls: { [key: number]: string } = {};

  for (const movie of movies) {
    try {
      // Film ID kontrolü
      if (!movie || !movie.id) {
        console.error("Geçersiz film verisi:", movie);
        continue;
      }

      // Koleksiyon kontrolü
      const collectionIsEmpty = isCollectionEmpty(movie.belongs_to_collection);

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
      }
    } catch (error) {
      console.error(`Film ${movie.id} için resim yüklenirken hata:`, error);
      // Hata durumunda varsayılan resim
      posterUrls[movie.id] = "/No-Poster.png";
    }
  }

  return posterUrls;
};

/**
 * Görsel yüklenemediğinde alternatif görsel kullanma işleyicisi
 * @param e Hata olayı
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>
): void => {
  const target = e.target as HTMLImageElement;

  // Önce diğer TMDB boyutunu dene
  if (target.src.includes("w500")) {
    target.src = target.src.replace("w500", "original");
  } else if (!target.src.includes("/no-poster.png")) {
    // Son çare olarak yerel yedek görseli kullan
    target.src = "/no-poster.png";
  }
};
