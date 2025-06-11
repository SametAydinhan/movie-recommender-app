// Öneri sistemi için özel başlatma dosyası
// Bu dosya, backend'i 3002 portunda çalıştırır
// Komut: node start-recommendations.js

// Process.env.PORT değerini zorla 3002 olarak ayarla
process.env.PORT = "3002";

// Konsola bilgi mesajı yazdır
console.log("Film Öneri Sistemi başlatılıyor...");
console.log("Port: 3002");
console.log("-------------------------------------");

// Ana uygulama dosyasını yükle
require("./src/app");
