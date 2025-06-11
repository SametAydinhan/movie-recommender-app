/**
 * Uygulama yapılandırma ayarları
 * Bu dosya, uygulama genelinde kullanılan yapılandırma değerlerini içerir.
 */

// Backend API endpoint'leri
export const API_CONFIG = {
  // Ana backend API'si
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",

  // Öneriler için özel endpoint (isteğe bağlı)
  RECOMMENDATIONS_URL:
    process.env.NEXT_PUBLIC_RECOMMENDATIONS_API_URL || "http://localhost:3002",
};

// API endpoint'leri
export const API_ENDPOINTS = {
  // Film API'leri
  MOVIES: `${API_CONFIG.BASE_URL}/api/movies`,
  MOVIE_SEARCH: `${API_CONFIG.BASE_URL}/api/movies/search`,
  MOVIE_RECOMMENDATIONS: `${API_CONFIG.RECOMMENDATIONS_URL}/api/movies/recommendations`,

  // Kullanıcı API'leri
  USER_LOGIN: `${API_CONFIG.BASE_URL}/api/users/login`,
  USER_REGISTER: `${API_CONFIG.BASE_URL}/api/users/register`,
  USER_WATCHED: `${API_CONFIG.BASE_URL}/api/users/watched`,
  USER_WATCHLIST: `${API_CONFIG.BASE_URL}/api/users/watchlist`,
};

// Önbellek ayarları
export const CACHE_CONFIG = {
  // Önbellekteki verilerin geçerlilik süresi (milisaniye cinsinden)
  // 1 saat = 60 * 60 * 1000
  RECOMMENDATIONS_TTL: 60 * 60 * 1000,

  // API istekleri için zaman aşımı süresi (milisaniye cinsinden)
  // 2 dakika = 2 * 60 * 1000
  RECOMMENDATIONS_TIMEOUT: 2 * 60 * 1000,
};

// Arayüz ayarları
export const UI_CONFIG = {
  // Sayfa başına gösterilecek film sayısı
  MOVIES_PER_PAGE: 25,

  // Arayüz tema değerleri
  THEME: {
    PRIMARY_COLOR: "purple",
    SECONDARY_COLOR: "gray",
  },
};
