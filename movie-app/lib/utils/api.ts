import { getAuthToken } from "@/utils/auth";

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

interface ApiResponse {
  movies: Movie[];
  pagination?: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  error?: string;
}

/**
 * Kullanıcı bilgisini getiren fonksiyon
 * @returns Kullanıcı ID'si veya hata
 */
export const fetchUserInfo = async (): Promise<
  { userId: number } | { error: string }
> => {
  const token = getAuthToken();
  if (!token) {
    return { error: "Kullanıcı girişi yapılmamış" };
  }

  try {
    const response = await fetch("http://localhost:3001/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Kullanıcı bilgileri alınamadı");
    }

    const data = await response.json();
    const userId = data.user?.id;

    if (!userId) {
      throw new Error("Kullanıcı ID'si bulunamadı");
    }

    return { userId };
  } catch (error: any) {
    console.error("Kullanıcı bilgileri getirilirken hata:", error);
    return { error: error.message || "Bir hata oluştu" };
  }
};

/**
 * Kullanıcının izlediği filmleri getiren fonksiyon
 * @param userId Kullanıcı ID'si
 * @param page Sayfa numarası
 * @param limit Sayfa başına film sayısı
 * @returns API yanıtı
 */
export const fetchWatchedMovies = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> => {
  const token = getAuthToken();
  if (!token) {
    return { movies: [], error: "Kullanıcı girişi yapılmamış" };
  }

  try {
    console.log(
      `İzlenen filmler getiriliyor: userId=${userId}, page=${page}, limit=${limit}`
    );

    const response = await fetch(
      `http://localhost:3001/api/users/${userId}/watched?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "GET",
      }
    );

    let responseData;
    try {
      // Önce JSON yanıtını almaya çalış
      responseData = await response.json();
    } catch (jsonError) {
      // JSON olarak ayrıştırılamıyorsa, text olarak al
      const errorText = await response.text();
      throw new Error(
        `API Yanıtı JSON olarak ayrıştırılamadı: ${
          errorText || "Bilinmeyen yanıt"
        }`
      );
    }

    if (!response.ok) {
      const errorMessage = responseData?.message || "Bilinmeyen hata";
      console.error("API yanıt hatası:", {
        status: response.status,
        statusText: response.statusText,
        responseData,
      });
      throw new Error(`API Hatası (${response.status}): ${errorMessage}`);
    }

    // API yanıt formatını kontrol et
    if (!responseData.success) {
      throw new Error(responseData.message || "API'den başarısız yanıt alındı");
    }

    // API'den gelen verileri kontrol et
    if (!responseData.movies || !Array.isArray(responseData.movies)) {
      console.warn("API'den beklenen film verisi alınamadı:", responseData);
      return {
        movies: [],
        pagination: {
          total: responseData.pagination?.total || 0,
          totalPages: responseData.pagination?.totalPages || 1,
          page: responseData.pagination?.page || page,
          limit: responseData.pagination?.limit || limit,
        },
      };
    }

    // API'den gelen verileri ApiResponse formatına dönüştür
    return {
      movies: responseData.movies || [],
      pagination: {
        total: responseData.pagination?.total || 0,
        totalPages: responseData.pagination?.totalPages || 1,
        page: responseData.pagination?.page || page,
        limit: responseData.pagination?.limit || limit,
      },
    };
  } catch (error: any) {
    console.error("İzlenen filmler alınırken hata:", error);
    return {
      movies: [],
      error: error.message || "Film verileri alınırken bir hata oluştu",
    };
  }
};

/**
 * Filmi izleme listesinden çıkaran fonksiyon
 * @param movieId Film ID'si
 * @returns Başarılı mı, değil mi?
 */
export const removeFromWatchlist = async (
  movieId: number
): Promise<{ success: boolean; message: string }> => {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      message: "Bu işlemi yapabilmek için giriş yapmalısınız",
    };
  }

  try {
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
      throw new Error("Film izleme listesinden çıkarılamadı");
    }

    return { success: true, message: "Film izleme listenizden çıkarıldı" };
  } catch (error: any) {
    console.error("Film izleme listesinden çıkarılırken hata:", error);
    return {
      success: false,
      message: error.message || "İşlem sırasında bir hata oluştu",
    };
  }
};

/**
 * Posterleri doğru formata getiren fonksiyon
 * @param movies Film listesi
 * @returns Poster yolları düzeltilmiş film listesi
 */
export const processMoviePosters = (movies: any[]): Movie[] => {
  return movies.map((movie) => {
    if (movie.poster_path) {
      if (!movie.poster_path.startsWith("http")) {
        if (!movie.poster_path.startsWith("/")) {
          movie.poster_path = "/" + movie.poster_path;
        }
      }
    } else {
      movie.poster_path = ""; // null yerine boş string
    }
    return movie;
  });
};

/**
 * Alternatif yöntem: Tüm filmleri getirip yerel olarak filtreleme yapar
 * @param page Sayfa numarası
 * @param limit Sayfa başına film sayısı
 * @returns API yanıtı
 */
export const fetchAlternativeWatchedMovies = async (
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse> => {
  try {
    // Tüm filmleri getir
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
      watchedMovieIds = allMovies.slice(0, 5).map((m: any) => m.id);
    }

    // İzlenen film ID'lerine göre filmleri filtreleme
    const watchedMovies = allMovies.filter((movie: any) =>
      watchedMovieIds.includes(movie.id)
    );

    // Manuel sayfalama
    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedMovies = watchedMovies.slice(start, end);

    return {
      movies: pagedMovies,
      pagination: {
        total: watchedMovies.length,
        totalPages: Math.ceil(watchedMovies.length / limit),
        page: page,
        limit: limit,
      },
    };
  } catch (error: any) {
    console.error("Alternatif film getirme işlemi sırasında hata:", error);
    return { movies: [], error: error.message };
  }
};

/**
 * Kullanıcı bilgilerini güncelleyen fonksiyon
 * @param userData Güncellenecek kullanıcı verileri
 * @returns İşlem sonucu
 */
export const updateUserProfile = async (userData: {
  username?: string;
  email?: string;
  password?: string;
}): Promise<{ success: boolean; message: string; user?: any }> => {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      message: "Bu işlemi yapabilmek için giriş yapmalısınız",
    };
  }

  try {
    const response = await fetch(`http://localhost:3001/api/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Profil güncellenirken bir hata oluştu");
    }

    return {
      success: true,
      message: "Profil başarıyla güncellendi",
      user: data.user,
    };
  } catch (error: any) {
    console.error("Profil güncellenirken hata:", error);
    return {
      success: false,
      message: error.message || "İşlem sırasında bir hata oluştu",
    };
  }
};

/**
 * Kullanıcı hesabını silen fonksiyon
 * @returns İşlem sonucu
 */
export const deleteUserAccount = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const token = getAuthToken();
  if (!token) {
    return {
      success: false,
      message: "Bu işlemi yapabilmek için giriş yapmalısınız",
    };
  }

  try {
    const response = await fetch(`http://localhost:3001/api/users/me`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Hesap silinirken bir hata oluştu");
    }

    return {
      success: true,
      message: "Hesabınız başarıyla silindi",
    };
  } catch (error: any) {
    console.error("Hesap silinirken hata:", error);
    return {
      success: false,
      message: error.message || "İşlem sırasında bir hata oluştu",
    };
  }
};
