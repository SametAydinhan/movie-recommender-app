# TMDb Film Poster Güncelleyici

Bu araç, yerel veritabanınızda bulunan filmlerin poster URL'lerini The Movie Database (TMDb) API'sini kullanarak güncellemenizi sağlar.

## Özellikler

- TMDb API ile film arama ve güncel poster URL'lerini çekme
- SQLite veritabanı desteği
- Çoklu iş parçacığı ile paralel işlem
- Detaylı log kaydı
- Kesintiye dayanıklı çalışma (limit ve offset ile kısmi işlem)
- Oran sınırlama ile API kullanım kotasına uyum
- Yapılandırma bilgileri için .env desteği

## Gereksinimler

- Python 3.6 veya üzeri
- requests kütüphanesi
- python-dotenv kütüphanesi
- TMDb API anahtarı
- SQLite veritabanı

## Kurulum

1. Gerekli paketleri yükleyin:

```bash
pip install requests python-dotenv
```

2. TMDb'den bir API anahtarı alın:

   - [TMDb](https://www.themoviedb.org/) sitesine kaydolun
   - Hesap ayarlarından "API" bölümüne gidin
   - Yeni bir API anahtarı oluşturun

3. Yapılandırma dosyasını hazırlayın:
   - `.env.example` dosyasını `.env` olarak kopyalayın
   - `.env` dosyasını düzenleyerek API anahtarınızı ve veritabanı yolunu ekleyin

## Kullanım

### Yapılandırma (.env Dosyası)

Aşağıdaki bilgileri `.env` dosyasına ekleyin:

```
TMDB_API_KEY=your_api_key_here
DB_FILE=path/to/your/database.sqlite
```

### Çalıştırma

Tüm yapılandırma .env dosyasında olduğunda, basitçe şu şekilde çalıştırabilirsiniz:

```bash
python tmdb_poster_updater.py
```

Veya komut satırında parametreleri belirterek:

```bash
python tmdb_poster_updater.py --db-file=veritabani.sqlite --api-key=API_ANAHTARINIZ
```

### Ek Parametreler

- `--limit`: İşlenecek maksimum film sayısı (örn: `--limit=100`)
- `--offset`: Başlangıç film indeksi (örn: `--offset=1000`)
- `--threads`: Paralel iş parçacığı sayısı (örn: `--threads=8`)

### Örnekler

İlk 100 filmi güncelle:

```bash
python tmdb_poster_updater.py --limit=100
```

1000. filmden başlayarak 500 filmi güncelle:

```bash
python tmdb_poster_updater.py --limit=500 --offset=1000
```

8 paralel iş parçacığı ile çalıştır:

```bash
python tmdb_poster_updater.py --threads=8
```

## Veritabanı Yapısı

Araç, `movies_metadata` tablosunu güncellemek için tasarlanmıştır. Tablonun aşağıdaki yapıya sahip olması gerekir:

- `id`: Film ID (birincil anahtar)
- `title`: Film başlığı
- `release_date`: Yayın tarihi (isteğe bağlı)
- `poster_path`: Poster yolu

## Notlar

- TMDb API'sinin adil kullanım limitleri vardır (saniyede 40 istek). Bu araç otomatik olarak istek oranını sınırlar.
- Güncel posterler `/xyz123.jpg` formatında kaydedilir ve tamamı için `https://image.tmdb.org/t/p/original` temel URL'i kullanılır.
- Eğer bir film bulunmazsa veya poster yoksa, o film atlanır ve log dosyasına kaydedilir.

## Log Dosyası

İşlem sırasında oluşan tüm olaylar `poster_updater.log` dosyasına kaydedilir.
