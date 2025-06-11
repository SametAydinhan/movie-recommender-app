/**
 * Sayfa gezinme durumlarını takip etmek için yardımcı fonksiyonlar
 *
 * Bu modül, sayfa geçişleri sırasında gereksiz API isteklerini önlemek için
 * gezinme olaylarını izlemek ve kaydetmek için kullanılır.
 */

// Son gezinme olayı için zaman damgası
let lastNavigationTimestamp = 0;

// Gezinme olayını kaydet
export function recordNavigation() {
  lastNavigationTimestamp = Date.now();

  // LocalStorage'a da kaydederek sayfalar arası geçişlerde bile korunmasını sağla
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        "lastNavigationTimestamp",
        lastNavigationTimestamp.toString()
      );
    } catch (e) {
      console.warn("Gezinme durumu localStorage'a kaydedilemedi:", e);
    }
  }

  return lastNavigationTimestamp;
}

// Son gezinme zamanını al
export function getLastNavigationTime(): number {
  // Eğer tarayıcı tarafında çalışıyorsa ve localStorage'dan bir değer varsa, onu kullan
  if (typeof window !== "undefined") {
    try {
      const storedTime = localStorage.getItem("lastNavigationTimestamp");
      if (storedTime) {
        const timestamp = parseInt(storedTime, 10);
        // Eğer localStorage'daki değer daha yeniyse, lastNavigationTimestamp'i güncelle
        if (timestamp > lastNavigationTimestamp) {
          lastNavigationTimestamp = timestamp;
        }
      }
    } catch (e) {
      console.warn("Gezinme durumu localStorage'dan alınamadı:", e);
    }
  }

  return lastNavigationTimestamp;
}

// Yakın zamanda bir sayfa geçişi olup olmadığını kontrol et (varsayılan 500ms)
export function isRecentNavigation(thresholdMs: number = 500): boolean {
  const navigationTime = getLastNavigationTime();
  return Date.now() - navigationTime < thresholdMs;
}

// Sayfa yükleme bilgilerini kaydet ve kontrol et - sayfa yenilemelerini algılamak için
let pageLoadTimestamp = 0;

// Sayfa yüklemesini kaydet
export function recordPageLoad() {
  pageLoadTimestamp = Date.now();

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("pageLoadTimestamp", pageLoadTimestamp.toString());
    } catch (e) {
      console.warn("Sayfa yükleme durumu localStorage'a kaydedilemedi:", e);
    }
  }

  return pageLoadTimestamp;
}

// Sayfa yeniden yüklenip yüklenmediğini kontrol et - yenilemelerinde true değerini döndürür
export function isPageRefresh(): boolean {
  // Eğer zaten bir gezinme kaydı yoksa (timestamp=0), bu bir sayfa yenilemesi olarak kabul edilebilir
  if (lastNavigationTimestamp === 0 && typeof window !== "undefined") {
    return true;
  }

  // Son gezinme ile son sayfa yükleme arasındaki farkı kontrol et
  // Eğer bu fark çok küçükse, bu muhtemelen bir sayfa yenilemesidir
  // Eğer büyükse, bu muhtemelen normal bir sayfa geçişidir
  return Math.abs(pageLoadTimestamp - lastNavigationTimestamp) < 100;
}
