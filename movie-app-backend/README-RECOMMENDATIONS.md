# Film Öneri Sistemi

Bu belge, film öneri sistemini 3002 portunda nasıl çalıştıracağınızı açıklar.

## Genel Bakış

Film öneri sistemi, ana backendden ayrı bir portta çalıştırılarak şu avantajları sağlar:

- Önerilerin hesaplanması diğer API işlemlerini engellemez
- Daha fazla kaynak tahsis edilebilir
- Yüksek yük altında daha iyi performans sunar

## Başlatma Talimatları

### 1. Terminal Komutu ile Başlatma (En Kolay Yöntem)

Aşağıdaki komutu yeni bir terminal penceresinde çalıştırın:

```bash
cd movie-app-backend
PORT=3002 npm start
```

### 2. Özel Başlatma Dosyası ile Başlatma

Oluşturduğumuz özel başlatma dosyasını kullanarak da başlatabilirsiniz:

```bash
cd movie-app-backend
node start-recommendations.js
```

Bu dosya, ortam değişkenlerini otomatik olarak ayarlayarak backend'i 3002 portunda başlatır.

### 3. PM2 ile Başlatma (Üretim Ortamları İçin)

PM2 süreç yöneticisini kullanarak arka planda çalıştırabilirsiniz:

```bash
# PM2 yükle (eğer yüklü değilse)
npm install -g pm2

# Backend'i 3002 portunda başlat
cd movie-app-backend
pm2 start start-recommendations.js --name "movie-recommendations"
```

## Sorun Giderme

Eğer `ERR_CONNECTION_REFUSED` hatası alıyorsanız:

1. Uygulamanın 3002 portunda çalıştığından emin olun
2. Başka bir uygulamanın 3002 portunu kullanmadığını kontrol edin
3. Aşağıdaki komutla hangi portların kullanımda olduğunu kontrol edebilirsiniz:

   ```bash
   # Windows
   netstat -ano | findstr :3002

   # Linux/Mac
   lsof -i :3002
   ```

## Frontend Yapılandırması

Frontend, öneri sistemi için 3002 portuna istek yapacak şekilde yapılandırılmalıdır. Bu yapılandırma `movie-app/lib/config.ts` dosyasında ve `.env.local` dosyasında bulunmaktadır.
