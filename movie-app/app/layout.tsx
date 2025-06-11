"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";

// Sayfa geçişlerini kaydetmek için api-navigation'dan fonksiyonları import et
import { recordNavigation, recordPageLoad } from "@/lib/utils/api-navigation";

const inter = Inter({ subsets: ["latin"] });

const metadata = {
  title: "Movie App",
  description: "İzlediğiniz filmleri veya dizileri takip edebilirsiniz.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [domLoaded, setDomLoaded] = useState(false);
  const pathname = usePathname(); // Sayfa yolunu izle

  // localStorage erişimini test etmek için kullanılır
  function isLocalStorageAvailable() {
    try {
      const testKey = "test-localstorage";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  useEffect(() => {
    // Tarayıcı ready olduğunda ve localStorage erişilebilir olduğunda domLoaded'ı true yap
    if (typeof window !== "undefined" && isLocalStorageAvailable()) {
      const timer = setTimeout(() => {
        setDomLoaded(true);
      }, 300); // Kısa bir gecikme, sayfanın güvenli bir şekilde yüklenmesini sağlar

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!domLoaded) return;

    // Chrome uzantılarıyla ilgili hataları ele almak için
    // cz-shortcut-listen gibi öznitelikleri temizle
    const removeUnwantedAttributes = () => {
      try {
        // body elementinden tüm 'cz-' ile başlayan öznitelikleri kaldır
        const body = document.querySelector("body");
        if (body) {
          const attrNames = Array.from(body.attributes)
            .map((attr) => attr.name)
            .filter((name) => name.startsWith("cz-"));

          attrNames.forEach((name) => {
            body.removeAttribute(name);
          });
        }
      } catch (e) {
        console.error("Öznitelik temizleme hatası:", e);
      }
    };

    // DOM yüklendiğinde çalıştır
    removeUnwantedAttributes();

    // MutationObserver ile sürekli kontrol et
    const observer = new MutationObserver(removeUnwantedAttributes);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["cz-shortcut-listen"],
    });

    return () => observer.disconnect();
  }, [domLoaded]);

  // Sayfa geçişlerini izle
  useEffect(() => {
    if (domLoaded) {
      console.log("Sayfa geçişi algılandı:", pathname);
      recordNavigation(); // Sayfa geçişini kaydet
    }
  }, [pathname, domLoaded]);

  // Sayfa yüklemesini kaydet
  useEffect(() => {
    if (domLoaded) {
      console.log("Sayfa yüklemesi kaydediliyor");
      recordPageLoad(); // Sayfa yüklemesini kaydet
    }
  }, [domLoaded]);

  return (
    <html lang='tr' suppressHydrationWarning>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>Movie App</title>
      </head>
      <body className={`${inter.className} pt-16`} suppressHydrationWarning>
        {domLoaded ? (
          <Provider store={store}>
            <Toaster position='top-right' />
            <Navbar />
            <div suppressHydrationWarning>{children}</div>
          </Provider>
        ) : (
          <div className='h-screen w-screen flex items-center justify-center bg-black'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500'></div>
          </div>
        )}
      </body>
    </html>
  );
}
