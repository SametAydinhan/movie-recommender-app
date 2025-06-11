import { FaStar, FaStarHalf, FaRegStar } from "react-icons/fa";
import React from "react";

/**
 * Dakika cinsinden süreyi insanların okuyabileceği formata dönüştürür
 * @param minutes Toplam dakika
 * @returns Formatlanmış süre metni (örn: "1 yıl 2 ay" veya "3 gün 5 saat")
 */
export const formatWatchTime = (minutes: number): string => {
  if (minutes <= 0) return "0 dakika";

  const minute = minutes % 60;
  const hour = Math.floor(minutes / 60) % 24;
  const day = Math.floor(minutes / (60 * 24)) % 7;
  const week = Math.floor(minutes / (60 * 24 * 7)) % 4;
  const month = Math.floor(minutes / (60 * 24 * 30)) % 12;
  const year = Math.floor(minutes / (60 * 24 * 365));

  const parts = [];

  if (year > 0) parts.push(`${year} yıl`);
  if (month > 0) parts.push(`${month} ay`);
  if (week > 0) parts.push(`${week} hafta`);
  if (day > 0) parts.push(`${day} gün`);
  if (hour > 0) parts.push(`${hour} saat`);
  if (minute > 0) parts.push(`${minute} dakika`);

  // En büyük 2 zaman birimini göster
  return parts.slice(0, 2).join(" ");
};

/**
 * Dakika cinsinden süreyi daha detaylı bilgilerle birlikte formatlar
 * @param minutes Toplam dakika
 * @returns Detaylı ve formatlanmış süre bilgisi
 */
export const formatWatchTimeDetailed = (
  minutes: number
): {
  formatted: string;
  detailedText: string;
  educationalValue: string;
  bookEquivalent: string;
} => {
  if (minutes <= 0) {
    return {
      formatted: "0 dakika",
      detailedText: "Henüz film izlememişsiniz",
      educationalValue: "Hiç eğitim değeri yok",
      bookEquivalent: "Hiç kitap değeri yok",
    };
  }

  const minute = minutes % 60;
  const hour = Math.floor(minutes / 60) % 24;
  const day = Math.floor(minutes / (60 * 24)) % 7;
  const week = Math.floor(minutes / (60 * 24 * 7)) % 4;
  const month = Math.floor(minutes / (60 * 24 * 30)) % 12;
  const year = Math.floor(minutes / (60 * 24 * 365));

  const parts = [];

  if (year > 0) parts.push(`${year} yıl`);
  if (month > 0) parts.push(`${month} ay`);
  if (week > 0) parts.push(`${week} hafta`);
  if (day > 0) parts.push(`${day} gün`);
  if (hour > 0) parts.push(`${hour} saat`);
  if (minute > 0) parts.push(`${minute} dakika`);

  // Tüm birimleri içeren detaylı metin
  const allParts = [];
  if (year > 0) allParts.push(`${year} yıl`);
  if (month > 0) allParts.push(`${month} ay`);
  if (week > 0) allParts.push(`${week} hafta`);
  if (day > 0) allParts.push(`${day} gün`);
  if (hour > 0) allParts.push(`${hour} saat`);
  if (minute > 0) allParts.push(`${minute} dakika`);

  // Eğitim değeri hesaplama (varsayımsal)
  const avgReadingSpeed = 250; // Dakikada 250 kelime
  const avgWordsPerPage = 300;
  const totalReadingMinutes = minutes * 0.6; // Filmin %60'ı kadar okuma süresi
  const pagesRead = Math.round(
    (totalReadingMinutes * avgReadingSpeed) / avgWordsPerPage
  );
  const books = Math.round(pagesRead / 300); // Ortalama 300 sayfalık kitap

  return {
    formatted: parts.slice(0, 2).join(" "),
    detailedText: allParts.join(", "),
    educationalValue: `Bu sürede yaklaşık ${pagesRead} sayfa okuyabilirdiniz.`,
    bookEquivalent: `Bu sürede yaklaşık ${books} adet ortalama uzunlukta kitap okuyabilirdiniz.`,
  };
};

/**
 * Tarih bilgisini formatlar
 * @param dateString ISO tarih formatında string
 * @returns Formatlanmış tarih (örn: "1 Ocak 2023")
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "Tarih bilgisi yok";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch (error) {
    return "Geçersiz tarih";
  }
};

/**
 * Film türlerini işler ve formatlar
 * @param genresData Tür bilgisi (string[] veya string)
 * @returns Formatlanmış tür listesi (örn: "Aksiyon, Macera, Bilim Kurgu")
 */
export const parseGenres = (genresData: string[] | string): string => {
  if (!genresData) return "Tür bilgisi yok";

  if (Array.isArray(genresData)) {
    return genresData.join(", ");
  }

  if (typeof genresData === "string") {
    try {
      const parsed = JSON.parse(genresData.replace(/'/g, '"'));
      return Array.isArray(parsed)
        ? parsed.map((g: any) => g.name || g).join(", ")
        : String(genresData);
    } catch (e) {
      return String(genresData);
    }
  }

  return "Tür bilgisi yok";
};

/**
 * Yıldız derecesini JSX elemanları olarak render eder
 * @param rating Puan (0-10 arasında)
 * @returns Yıldız ikonları dizisi
 */
export const getStarRating = (rating: number): React.ReactNode[] => {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating / 2);
  const halfStar = rating % 2 >= 1;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  // Dolu yıldızlar
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      React.createElement(FaStar, {
        key: `full_${i}`,
        className: "text-yellow-400",
      })
    );
  }

  // Yarım yıldız
  if (halfStar) {
    stars.push(
      React.createElement(FaStarHalf, {
        key: "half",
        className: "text-yellow-400",
      })
    );
  }

  // Boş yıldızlar
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      React.createElement(FaRegStar, {
        key: `empty_${i}`,
        className: "text-yellow-400",
      })
    );
  }

  return stars;
};
