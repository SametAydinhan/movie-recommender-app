/**
 * Film modeli
 */
export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  poster_url?: string; // Backend'den gelen tam poster URL'i
  vote_average: number;
  release_date: string;
  runtime: number;
  overview: string;
  genres: string[] | string;
  watched_at?: string;
  vote_count?: number;
  belongs_to_collection?: any;
  tmdbId?: string;
  similarity_score?: number; // Öneri sisteminden gelen benzerlik puanı
  similarity?: number; // Benzerlik oranı (0-1 arasında) - öneri sisteminden gelen değer
}

/**
 * API yanıt modeli
 */
export interface ApiResponse {
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
 * Kullanıcı bilgisi yanıtı
 */
export interface UserInfoResponse {
  userId?: number;
  error?: string;
}

/**
 * API işlem sonucu
 */
export interface ApiResult {
  success: boolean;
  message: string;
}

/**
 * Film poster bilgileri
 */
export interface PosterInfo {
  [key: number]: string; // Film ID'sine göre poster URL'leri
}

/**
 * Görsel yükleme durumları
 */
export interface ImageLoadingStates {
  [key: number]: boolean; // Film ID'sine göre yükleniyor durumu
}
