# Film Öneri Uygulaması

Bu proje, kullanıcıların film önerileri alabileceği ve izledikleri filmleri takip edebileceği bir web uygulamasıdır. Backend ve frontend olmak üzere iki ana bileşenden oluşur.

## Proje Yapısı

- **movie-app-backend**: Backend API ve film öneri sistemi
- **movie-app**: Next.js ile geliştirilmiş frontend uygulaması
- **movie-poster-updater**: Film posterlerini güncellemek için kullanılan araç

## Başlangıç

### Backend Kurulumu

1. Backend klasörüne gidin:
   ```bash
   cd movie-app-backend
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```
4. Öneri sistemi için yeni bir port ayağa kaldırın:
   ```bash
   node start-recommendations.js
   ```

### Frontend Kurulumu

1. Frontend klasörüne gidin:
   ```bash
   cd movie-app
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

4. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

## Film Öneri Sistemi

Film öneri sistemi, ana backendden ayrı bir portta çalıştırılarak şu avantajları sağlar:

- Önerilerin hesaplanması diğer API işlemlerini engellemez
- Daha fazla kaynak tahsis edilebilir
- Yüksek yük altında daha iyi performans sunar

Detaylı bilgi için [movie-app-backend/README-RECOMMENDATIONS.md](movie-app-backend/README-RECOMMENDATIONS.md) dosyasına bakabilirsiniz.

## Ekran Görüntüleri
![image](https://github.com/user-attachments/assets/ba58f637-d579-46e4-be39-d6c6266adbc9)
![image](https://github.com/user-attachments/assets/a1bab2ef-9814-4cab-a744-815d9d470f37)
![image](https://github.com/user-attachments/assets/734e6398-efd5-47b8-87e6-7cbab3c358c0)
![image](https://github.com/user-attachments/assets/55954687-2654-4afb-b30a-63cb8fa320f2)
![image](https://github.com/user-attachments/assets/565ef520-cbad-45aa-aba6-2355ad53d7bf)
![image](https://github.com/user-attachments/assets/7ace6510-8823-4988-88cf-692994bba605)
![image](https://github.com/user-attachments/assets/52783862-3c52-40b2-9297-8fdceb81568e)
![image](https://github.com/user-attachments/assets/7ec58c5b-cc74-4ba1-9bcc-d33d11800d5b)
![image](https://github.com/user-attachments/assets/fb1305db-4cbd-4ace-b026-545665e627c3)
![image](https://github.com/user-attachments/assets/3606b1b2-bcaf-49b8-ac64-9bff545971fc)
![image](https://github.com/user-attachments/assets/f127403c-d95e-4e99-8bd9-1ec59dbc7afa)
![image](https://github.com/user-attachments/assets/13f638e4-c049-493a-afdd-43f6068b8a38)












<!-- Buraya ekran görüntüleri eklenecek -->
