import { getAuthToken } from "@/utils/auth";
import { Movie, ApiResponse } from "@/lib/types";
import { API_ENDPOINTS, CACHE_CONFIG } from "@/lib/config";
import { isRecentNavigation, getLastNavigationTime } from "./api-navigation";

/**
 * Filmleri getiren fonksiyon
 * @param page Sayfa numarası
 * @param searchTerm Arama terimi
 * @returns API yanıtı
 */
export const fetchMovies = async (
  page: number = 1,
  searchTerm: string = ""
): Promise<ApiResponse> => {
  try {
    // API URL'ini oluştur
    let apiUrl = "";

    // Arama yapılıyorsa SearchMovies API'sini kullan
    if (searchTerm.trim() !== "") {
      apiUrl = `http://localhost:3001/api/movies/search?page=${page}&limit=20&search=${encodeURIComponent(
        searchTerm.trim()
      )}`;
    } else {
      apiUrl = `http://localhost:3001/api/movies?page=${page}&limit=20`;
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
      let totalPages = 1;

      // API'nin döndürdüğü veri yapısını kontrol et
      if (data.results) {
        // Eski API formatı (results içinde)
        moviesData = Array.isArray(data.results) ? data.results : [];
        totalPages = data.total_pages || 1;
      } else if (data.movies) {
        // Yeni API formatı (movies içinde)
        moviesData = Array.isArray(data.movies) ? data.movies : [];
        totalPages = data.totalPages || data.pagination?.totalPages || 1;
      } else {
        // Hiçbir format uyumlu değilse, veriyi doğrudan kontrol et
        console.log("Doğrudan veri kontrolü:", data);
        if (Array.isArray(data)) {
          moviesData = data;
          totalPages = 1;
        } else {
          moviesData = [];
          throw new Error("API'den geçerli veri alınamadı.");
        }
      }

      return {
        movies: moviesData,
        pagination: {
          total: moviesData.length,
          totalPages,
          page,
          limit: 20,
        },
      };
    } catch (fetchError: any) {
      console.error("Fetch işlemi sırasında hata:", fetchError);
      throw new Error(`Sunucuya bağlanılamıyor: ${fetchError.message}`);
    }
  } catch (error: any) {
    console.error("Filmler alınırken hata:", error);
    return {
      movies: [],
      error: `Filmler yüklenemedi: ${error.message || "Bilinmeyen hata"}`,
    };
  }
};

/**
 * Kullanıcının izleme listesinde bir filmi işaretlemek/işaretini kaldırmak için kullanılır
 * @param movieId Film ID
 * @param isAlreadyWatched Zaten izlenmiş mi?
 * @returns API işlem sonucu
 */
export const toggleWatchedMovie = async (
  movieId: number,
  isAlreadyWatched: boolean
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      message: "Bu işlemi yapabilmek için giriş yapmalısınız.",
    };
  }

  try {
    if (isAlreadyWatched) {
      // İzlenenlerden çıkar
      const response = await fetch(
        `http://localhost:3001/api/users/watched/${movieId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = "Filmler listeden çıkarılırken bir hata oluştu";

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("API yanıtı JSON olarak ayrıştırılamadı:", jsonError);
        }

        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: "Film izleme listenizden çıkarıldı.",
      };
    } else {
      // İzlenenlere ekle
      const response = await fetch(`http://localhost:3001/api/users/watched`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });

      if (!response.ok) {
        let errorMessage = "Film izleme listesine eklenirken bir hata oluştu";

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("API yanıtı JSON olarak ayrıştırılamadı:", jsonError);
        }

        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: "Film izleme listenize eklendi.",
      };
    }
  } catch (error: any) {
    console.error("API isteği sırasında hata:", error);
    return {
      success: false,
      message: error.message || "Bir hata oluştu.",
    };
  }
};

/**
 * Koleksiyon bilgisinin boş olup olmadığını kontrol eder
 * @param collection Koleksiyon verisi
 * @returns Boş mu?
 */
export const isCollectionEmpty = (collection: any): boolean => {
  // Null veya undefined kontrolü
  if (collection === null || collection === undefined) return true;

  // String kontrolü
  if (typeof collection === "string") {
    // Boş string, "null" string veya "undefined" string kontrolü
    if (
      collection === "" ||
      collection === "null" ||
      collection === "undefined"
    )
      return true;

    // JSON string kontrolü
    try {
      const parsed = JSON.parse(collection);
      // Boş obje veya array kontrolü
      return (
        parsed === null ||
        (typeof parsed === "object" && Object.keys(parsed).length === 0) ||
        (Array.isArray(parsed) && parsed.length === 0)
      );
    } catch (e) {
      // Geçersiz JSON, boş kabul et
      return true;
    }
  }

  // Obje kontrolü
  if (typeof collection === "object") {
    // Boş obje kontrolü
    return Object.keys(collection).length === 0;
  }

  // Hiçbir duruma uymuyorsa boş değil kabul et
  return false;
};

// API istekleri için önbellek
export const recommendationsCache = {
  data: null as null | {
    recommendations: Movie[];
    timestamp: number;
    watchedMoviesHash: string;
  },
  // Aktif bir istek olup olmadığını takip eden durum
  activeRequest: null as null | Promise<any>,
  // Son sayfa geçişini takip etmek için zaman damgası
  lastNavigationTimestamp: 0,
  // Önbelleğin geçerli olup olmadığını kontrol et
  isValid: function (currentHash: string): boolean {
    if (!this.data) {
      console.log("Önbellek boş, geçersiz");
      return false;
    }

    // Yapılandırma dosyasından önbellek süresi kullan
    const cacheAge = Date.now() - this.data.timestamp;
    const isCacheValid = cacheAge < CACHE_CONFIG.RECOMMENDATIONS_TTL;
    const isHashSame = this.data.watchedMoviesHash === currentHash;

    // Sadece önbellek geçerli olmadığında veya hash değiştiğinde log tut
    if (!isCacheValid || !isHashSame) {
      console.log(
        `Önbellek durumu: ${
          isCacheValid ? "Geçerli" : "Geçersiz"
        } (${Math.floor(
          cacheAge / 1000 / 60
        )} dakika), Hash eşleşmesi: ${isHashSame}`
      );
    }

    return isCacheValid && isHashSame;
  },
  // Sayfa geçişini kaydet
  recordNavigation: function () {
    this.lastNavigationTimestamp = Date.now();
  },
  // Sayfa geçişi sonrası kısa süre içinde istek yapılıp yapılmadığını kontrol et (500ms)
  isRecentNavigation: function () {
    return Date.now() - this.lastNavigationTimestamp < 500;
  },
  // Önbelleği güncelle
  update: function (recommendations: Movie[], watchedMoviesHash: string) {
    this.data = {
      recommendations,
      timestamp: Date.now(),
      watchedMoviesHash,
    };
    console.log(`Önbellek güncellendi: ${recommendations.length} film`);

    // Önbelleği localStorage'a da kaydedelim böylece sayfayı yenilediğimizde de korunur
    try {
      localStorage.setItem(
        "recommendationsCache",
        JSON.stringify({
          recommendations,
          timestamp: Date.now(),
          watchedMoviesHash,
        })
      );

      // Ayrıca Redux'un kullandığı cachedRecommendations'a da kaydet
      localStorage.setItem(
        "cachedRecommendations",
        JSON.stringify({
          recommendations,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Önbellek localStorage'a kaydedilemedi:", e);
    }
  },
  // Önbelleği temizle
  clear: function () {
    this.data = null;
    try {
      localStorage.removeItem("recommendationsCache");
    } catch (e) {
      console.warn("Önbellek localStorage'dan silinemedi:", e);
    }
  },
  // Uygulama başladığında localStorage'dan önbelleği yükle
  loadFromStorage: function () {
    try {
      const cachedData = localStorage.getItem("recommendationsCache");
      if (cachedData) {
        this.data = JSON.parse(cachedData);
        console.log(
          `Önbellek localStorage'dan yüklendi: ${this.data.recommendations.length} film`
        );
      }
    } catch (e) {
      console.warn("Önbellek localStorage'dan yüklenemedi:", e);
    }
  },
};

// Uygulama başladığında önbelleği yükle
try {
  recommendationsCache.loadFromStorage();
} catch (e) {
  console.warn("Başlangıçta önbellek yüklenemedi:", e);
}

// İzlenen filmlerin hash'ini hesapla
function calculateWatchedMoviesHash(watchedMovies: number[]): string {
  return [...watchedMovies].sort((a, b) => a - b).join(",");
}

export const fetchRecommendedMovies = async (
  watchedMovies?: number[],
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  recommendations?: Movie[];
  message?: string;
  fromCache?: boolean;
}> => {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      message: "Film önerileri için giriş yapmalısınız.",
    };
  }

  // Performans ölçümü başlat
  const startTime = performance.now();

  // Sayfa geçişinden hemen sonra ise ve forceRefresh true değilse, önbelleği kullan
  if (!forceRefresh && isRecentNavigation(500)) {
    console.log("Sayfa geçişi algılandı, API isteği atlanıyor");
    // LocalStorage'dan önbelleği kontrol et
    if (typeof window !== "undefined") {
      try {
        const cachedData = localStorage.getItem("cachedRecommendations");
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          console.log("Sayfa geçişi: LocalStorage önbelleği kullanılıyor");
          return {
            success: true,
            recommendations: parsed.recommendations || [],
            fromCache: true,
          };
        }
      } catch (e) {
        console.warn("Sayfa geçişi sırasında önbellek yüklenemedi:", e);
      }
    }
  }

  try {
    // izlenen filmler verilmişse, önbellek için hash hesapla
    let watchedMoviesHash = "";
    if (watchedMovies && watchedMovies.length > 0) {
      watchedMoviesHash = calculateWatchedMoviesHash(watchedMovies);

      // Sayfa yenilemelerinde veya sayfalar arası geçişlerde localStorage'dan önce yüklenen önbelleği kontrol et
      if (
        !forceRefresh &&
        !recommendationsCache.data &&
        typeof window !== "undefined"
      ) {
        try {
          const cachedData = localStorage.getItem("cachedRecommendations");
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            // Eğer önbellekteki veriler aynı izlenen film listesine aitse ve güncel ise
            if (
              parsed.timestamp &&
              Date.now() - parsed.timestamp < CACHE_CONFIG.RECOMMENDATIONS_TTL
            ) {
              console.log("LocalStorage'dan önbellek yükleniyor");
              return {
                success: true,
                recommendations: parsed.recommendations || [],
                fromCache: true,
              };
            }
          }
        } catch (e) {
          console.warn("Önbellek LocalStorage'dan yüklenemedi:", e);
        }
      }

      // Önbellekten kontrol et - forceRefresh true ise önbelleği atlayalım
      if (!forceRefresh && recommendationsCache.isValid(watchedMoviesHash)) {
        // Sadece ilk sefer logla, tekrarlayan isteklerde loglamayı azalt
        console.log("Önbellekten film önerileri kullanılıyor");
        return {
          success: true,
          recommendations: recommendationsCache.data!.recommendations,
          fromCache: true,
        };
      }
    }

    // Sayfa yenilemelerinde gereksiz API çağrısını önlemek için ek kontrol
    if (!forceRefresh && typeof window !== "undefined") {
      const cachedData = localStorage.getItem("cachedRecommendations");
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cachedTimestamp = parsed.timestamp || 0;

          // Önbellek son 30 dakika içinde güncellenmiş ve sayfa yenilenmiş veya geçiş yapılmışsa
          // ve izlenen filmler değişmediyse, API çağrısını atla
          if (Date.now() - cachedTimestamp < 30 * 60 * 1000) {
            console.log(
              "Sayfa yenilendi: Yerel önbellek kullanılıyor - API isteği atlanıyor"
            );
            return {
              success: true,
              recommendations: parsed.recommendations || [],
              fromCache: true,
            };
          }
        } catch (e) {
          console.warn("Önbellek işlenirken hata:", e);
        }
      }
    }

    // Zaten devam eden bir istek varsa, onu yeniden kullan
    if (recommendationsCache.activeRequest) {
      console.log(
        "Zaten devam eden bir istek var, o tamamlanana kadar beklenecek"
      );
      return await recommendationsCache.activeRequest;
    }

    // Bu noktaya ulaşılmışsa, API isteği yapmamız gerekiyor

    // Eğer forceRefresh true ise veya önbellek geçersizse, doğrudan API'den al
    if (forceRefresh) {
      console.log("Önbellek atlanıyor - API'den yeni veriler alınıyor");
      // Aktif isteği başlat ve cache
      recommendationsCache.activeRequest = fetchRecommendedMoviesFromAPI(
        token,
        watchedMoviesHash,
        watchedMovies
      );

      try {
        const result = await recommendationsCache.activeRequest;
        return result;
      } finally {
        // İstek tamamlandığında aktif isteği temizle
        recommendationsCache.activeRequest = null;
      }
    }

    // Statik veri - Çok fazla yeniden yüklenmeyi önlemek için
    if (typeof window !== "undefined" && !forceRefresh) {
      // Önbellekteki eski veri bile olsa, ilk istek için kullan,
      // arka planda güncel veriyi al
      if (
        recommendationsCache.data &&
        recommendationsCache.data.recommendations.length > 0
      ) {
        console.log(
          "Güncel olmayan önbellek verisi kullanılıyor (arka planda yenileniyor)"
        );

        // Arka planda yeni veriyi yükle
        if (!recommendationsCache.activeRequest) {
          recommendationsCache.activeRequest = fetchRecommendedMoviesFromAPI(
            token,
            watchedMoviesHash,
            watchedMovies
          );

          recommendationsCache.activeRequest
            .then((result) => {
              if (result.success && result.recommendations) {
                recommendationsCache.update(
                  result.recommendations,
                  watchedMoviesHash
                );
                console.log("Arka planda önbellek güncellendi");
              }
            })
            .catch((err) => console.warn("Arka plan yenileme hatası:", err))
            .finally(() => {
              recommendationsCache.activeRequest = null;
            });
        }

        // Eski veriyi döndür
        return {
          success: true,
          recommendations: recommendationsCache.data.recommendations,
        };
      }
    }

    // Tam API isteği yap
    recommendationsCache.activeRequest = fetchRecommendedMoviesFromAPI(
      token,
      watchedMoviesHash,
      watchedMovies
    );

    try {
      const result = await recommendationsCache.activeRequest;
      return result;
    } finally {
      // İstek tamamlandığında aktif isteği temizle
      recommendationsCache.activeRequest = null;
    }
  } catch (error: any) {
    // Hata ayrıntılarını konsola yaz ama kullanıcıya daha yumuşak mesajlar göster
    console.log(
      `Film önerileri alınırken hata (${Math.floor(
        performance.now() - startTime
      )}ms):`,
      error.name || "Bilinmeyen hata"
    );

    return {
      success: true, // Kullanıcı deneyimi için başarılı kabul ediyoruz
      recommendations: [],
      message:
        "Film önerileri geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
};

// API'den film önerilerini alma fonksiyonu - fetchRecommendedMovies'den ayrıldı
async function fetchRecommendedMoviesFromAPI(
  token: string,
  watchedMoviesHash: string = "",
  watchedMovies?: number[]
): Promise<{
  success: boolean;
  recommendations?: Movie[];
  message?: string;
}> {
  // Performans ölçümü başlat
  const startTime = performance.now();

  // Beklenebilecek uzun bir işlem olduğunu kullanıcıya bildir
  console.log(
    "Film önerileri hesaplanıyor - bu işlem 60-90 saniye sürebilir..."
  );

  // AbortController ile zaman aşımı kontrolü - CACHE_CONFIG'den süreyi al
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CACHE_CONFIG.RECOMMENDATIONS_TIMEOUT
  );

  console.log("Film önerileri için API çağrısı yapılıyor...");

  try {
    // Asenkron bir gösterge başlat
    let waitIndicator = 0;
    const waitTimer = setInterval(() => {
      waitIndicator++;
      if (waitIndicator % 5 === 0) {
        console.log(
          `Film önerileri bekleniyor... ${waitIndicator} saniye geçti`
        );
      }
    }, 1000);

    // Backend'e gönderilecek URL'i hazırla
    // Önemli: forceRefresh parametresini URL'e ekle
    const apiUrl = new URL(API_ENDPOINTS.MOVIE_RECOMMENDATIONS);
    apiUrl.searchParams.append("forceRefresh", "true"); // API'nin önbelleği atlamasını sağla

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      // Cache-control ekle
      cache: "no-store",
    });

    // İşaretçiyi temizle
    clearInterval(waitTimer);

    // Zamanlayıcıyı temizle
    clearTimeout(timeoutId);

    console.log(
      `API yanıtı alındı (${performance.now() - startTime}ms):`,
      response.status,
      response.statusText
    );

    // Yanıt durumuna göre işlem yapma
    if (!response.ok) {
      let errorMessage = `Film önerileri alınırken hata oluştu (${response.status}: ${response.statusText})`;

      try {
        const errorData = await response.json();
        console.log("Hata yanıtı:", errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (jsonError) {
        console.error("API yanıtı JSON olarak ayrıştırılamadı:", jsonError);
        // JSON ayrıştırılamıyorsa kullanıcıyı çok fazla bilgilendirme
        errorMessage = "Film önerileri şu anda alınamıyor";
      }

      // 404 hatası veya izlenen film yoksa durumu için özel işleme
      if (
        response.status === 404 ||
        errorMessage.includes("izlenen film") ||
        errorMessage.includes("Öneri yapılabilmesi için")
      ) {
        console.log("Özel durum: Henüz öneri yapılamıyor");
        return {
          success: true,
          recommendations: [],
          message: "Öneri yapılabilmesi için daha fazla film izlemelisiniz.",
        };
      }

      console.error(errorMessage);
      return {
        success: true,
        recommendations: [],
        message:
          "Film önerileri geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      };
    }

    const data = await response.json();
    console.log(
      `Önerilen filmler yanıtı işlendi (${performance.now() - startTime}ms):`,
      data.success
        ? `${data.recommendations?.length || 0} film`
        : data.message || "Hata"
    );

    if (!data.success) {
      return {
        success: true,
        recommendations: [],
        message: data.message || "Film önerileri şu anda kullanılamıyor.",
      };
    }

    // Hiç öneri yoksa
    if (!data.recommendations || data.recommendations.length === 0) {
      return {
        success: true,
        recommendations: [],
        message: "Size önerebileceğimiz film bulunamadı.",
      };
    }

    // Önbelleğe kaydet - eğer izlenen filmler verilmişse
    if (watchedMovies && watchedMovies.length > 0 && watchedMoviesHash) {
      recommendationsCache.update(data.recommendations, watchedMoviesHash);
    }

    return {
      success: true,
      recommendations: data.recommendations || [],
    };
  } catch (fetchError: any) {
    // Zamanlayıcıyı temizle (hata durumunda da)
    clearTimeout(timeoutId);

    // Özel bir hata olup olmadığını kontrol et
    if (fetchError.name === "AbortError") {
      console.log(
        "Film önerileri isteği zaman aşımına uğradı - Fallback kullanılıyor"
      );

      // Eğer zaman aşımı olduysa ve önbellekte eski veri varsa onu kullan
      if (
        recommendationsCache.data &&
        recommendationsCache.data.recommendations.length > 0
      ) {
        console.log(
          "Zaman aşımı nedeniyle önbellekteki eski öneri verileri kullanılıyor"
        );
        return {
          success: true,
          recommendations: recommendationsCache.data.recommendations,
          message:
            "Öneriler şu anda güncellenemiyor. Önbellekteki öneriler gösteriliyor.",
        };
      }

      // Fallback: boş bir dizi dön ama hatayı daha yumuşak göster
      return {
        success: true,
        recommendations: [],
        message:
          "Film önerileri şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
      };
    }

    // Diğer fetch hataları
    throw fetchError; // Ana hata yakalama bloğunda işlensin
  }
}
