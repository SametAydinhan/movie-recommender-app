# Film Öneri Sistemi Dağıtım Kılavuzu

Bu kılavuz, film öneri sisteminin farklı bir sunucuda nasıl çalıştırılacağını adım adım açıklamaktadır.

## 1. Backend Kurulumu

Film öneri sistemi, Node.js tabanlı bir Express uygulamasıdır. Backend kodları `movie-app-backend` klasöründe bulunmaktadır.

### Gereksinimler

- Node.js (v14 veya üzeri)
- MySQL veritabanı
- npm veya yarn paket yöneticisi

### Adımlar

1. `movie-app-backend` klasörünü yeni sunucuya kopyalayın
2. Klasöre girin ve bağımlılıkları yükleyin:
   ```bash
   cd movie-app-backend
   npm install
   ```
3. `.env` dosyasını oluşturun ve veritabanı bağlantı bilgilerini ayarlayın:
   ```
   DB_HOST=veritabani_sunucusu
   DB_NAME=film_veritabani
   DB_USER=kullanici_adi
   DB_PASSWORD=parola
   JWT_SECRET=gizli_anahtar_buraya
   PORT=3001
   ```
4. Veritabanını yapılandırın:
   ```bash
   node test_db.js
   ```
5. Film verilerini içe aktarın (isteğe bağlı):
   ```bash
   python import_data.py
   ```
6. Uygulamayı başlatın:
   ```bash
   npm start
   ```

## 1.1 Öneri Sistemi için İkinci Backend Kurulumu (3002 Portu)

Öneri sisteminin ana uygulamadan bağımsız ve daha hızlı çalışması için, aynı backend kodlarını farklı bir portta çalıştırabilirsiniz.

### 1. Yöntem - PORT değişkeni ile çalıştırma

En basit yöntem, aynı uygulamayı farklı bir terminal penceresinde, farklı PORT değişkeni ile çalıştırmaktır:

```bash
cd movie-app-backend
PORT=3002 npm start
```

### 2. Yöntem - Backend kopyası oluşturma

Daha kalıcı bir çözüm için, backend kodlarını kopyalayabilirsiniz:

```bash
# Mevcut backend kodlarını kopyala
cp -r movie-app-backend movie-recommender-backend

# Yeni klasöre git
cd movie-recommender-backend

# .env dosyasını oluştur (3002 portu ile)
echo "DB_HOST=veritabani_sunucusu
DB_NAME=film_veritabani
DB_USER=kullanici_adi
DB_PASSWORD=parola
JWT_SECRET=gizli_anahtar_buraya
PORT=3002" > .env

# Uygulamayı başlat
npm start
```

### 3. Yöntem - PM2 ile çalıştırma

PM2 süreç yöneticisi kullanarak aynı uygulamayı farklı portlarda çalıştırabilirsiniz:

```bash
# PM2 yükle (eğer yüklü değilse)
npm install -g pm2

# Backend klasörüne git
cd movie-app-backend

# PM2 için config dosyası oluştur
echo '{
  "apps": [
    {
      "name": "movie-api-3001",
      "script": "src/app.js",
      "env": {
        "PORT": 3001
      }
    },
    {
      "name": "movie-recommendations-3002",
      "script": "src/app.js",
      "env": {
        "PORT": 3002
      }
    }
  ]
}' > pm2.config.json

# PM2 ile başlat
pm2 start pm2.config.json
```

Bu şekilde tek bir komutla hem ana API (3001) hem de öneri API (3002) çalıştırılabilir. PM2, uygulamanızı arka planda çalıştırır ve otomatik yeniden başlatma sağlar.

## 2. Frontend Yapılandırması

Film öneri sistemini kullanabilmek için frontend uygulamasında bazı ayarlarla API URL'lerini değiştirmeniz gerekmektedir.

### Environment Variables ile Yapılandırma

Frontend'de API URL'lerini ayarlamak için `.env.local` dosyası oluşturun:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_RECOMMENDATIONS_API_URL=http://localhost:3002
```

### Doğrudan Yapılandırma

Alternatif olarak, `lib/config.ts` dosyasını düzenleyerek API URL'lerini doğrudan değiştirebilirsiniz:

```typescript
export const API_CONFIG = {
  // Ana backend API'si
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",

  // Öneriler için özel endpoint
  RECOMMENDATIONS_URL:
    process.env.NEXT_PUBLIC_RECOMMENDATIONS_API_URL || "http://localhost:3002",
};
```

## 3. API Endpoint'leri

Film öneri sistemi aşağıdaki API endpoint'lerini kullanır:

- `/api/movies/recommendations` - Film önerilerini getir (kimlik doğrulaması gerekir) - 3002 portunda
- `/api/users/watched` - İzlenen filmleri getir (kimlik doğrulaması gerekir) - 3001 portunda
- `/api/users/watched/:id` - Film izlenmiş olarak işaretle (kimlik doğrulaması gerekir) - 3001 portunda

## 4. CORS Yapılandırması

Backend'iniz farklı bir alan adında çalışıyorsa, CORS yapılandırmasını güncellemeniz gerekir. `src/app.js` dosyasını aşağıdaki gibi düzenleyin:

```javascript
const corsOptions = {
  origin: ["https://your-frontend-domain.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
```

## 5. Güvenlik Önlemleri

Production ortamında çalıştırırken aşağıdaki güvenlik önlemlerini almanız önerilir:

1. HTTPS kullanın
2. JWT secret'ınızı güçlü ve benzersiz tutun
3. Rate limiter ekleyin
4. Helmet.js kullanarak HTTP başlıklarını güvenli hale getirin

## 6. Performans İyileştirmeleri

Öneri sistemi yüksek hesaplama gerektirdiğinden, aşağıdaki performans iyileştirmelerini yapmanız önerilir:

1. Öneri hesaplamalarının sonuçlarını önbelleğe alın (Redis kullanılabilir)
2. İzlenen filmler değişmediği sürece önbelleği kullanın
3. Örnek implementasyon:

```javascript
// recommendationController.js dosyasında yapılacak değişiklik
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;

    // Önbellekten kontrol et
    const cacheKey = `recommendations:${userId}`;
    const cachedRecommendations = await redis.get(cacheKey);

    if (cachedRecommendations) {
      return res.json(JSON.parse(cachedRecommendations));
    }

    // Mevcut hesaplama kodu...

    // Sonuçları önbelleğe al (1 saat süreyle)
    await redis.set(cacheKey, JSON.stringify(result), "EX", 3600);

    res.json(result);
  } catch (error) {
    console.error("Film önerileri alınırken hata:", error);
    res.status(500).json({
      success: false,
      message: "Film önerileri hesaplanırken bir hata oluştu.",
    });
  }
};
```

## 7. Sorun Giderme

Yaygın sorunlar ve çözümleri:

1. **Bağlantı Hatası**: API URL'lerinin doğru yapılandırıldığından emin olun
2. **Kimlik Doğrulama Hatası**: JWT token yapılandırmasını kontrol edin
3. **Öneriler Yüklenemedi**: Backend'de hesaplama için yeterli bellek olduğundan emin olun
4. **CORS Hatası**: Frontend ve backend arasındaki CORS yapılandırmasını kontrol edin
5. **ERR_CONNECTION_REFUSED**: 3002 portunda backend çalışmıyor olabilir, terminalde `PORT=3002 npm start` komutunu çalıştırdığınızdan emin olun

## 8. Dağıtım Seçenekleri

Backend'i dağıtmak için çeşitli seçenekler:

1. **VPS/Dedicated Server**:
   - Node.js + PM2 + Nginx
2. **Docker**:

   ```
   docker build -t movie-recommender-backend .
   docker run -p 3001:3001 -p 3002:3002 --env-file .env movie-recommender-backend
   ```

3. **Serverless**:
   - AWS Lambda + API Gateway
   - Vercel Serverless Functions
