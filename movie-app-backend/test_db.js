// Veritabanı bağlantısını test et
const sequelize = require("./src/config/database");
const { MoviesMetaData, Credits, Keywords } = require("./src/models");

async function testDb() {
  try {
    // Bağlantıyı test et
    await sequelize.authenticate();
    console.log("✅ Veritabanına başarıyla bağlanıldı.");

    // Film tablosundaki kayıt sayısını kontrol et
    const { count, rows } = await MoviesMetaData.findAndCountAll({
      limit: 3,
    });

    console.log(`📊 Veritabanında toplam ${count} film bulunuyor.`);

    if (rows.length > 0) {
      console.log("\n🎬 İlk 3 film:");
      rows.forEach((movie, index) => {
        console.log(`${index + 1}. ${movie.title} (ID: ${movie.id})`);
      });
    } else {
      console.log("⚠️ Veritabanında film bulunamadı!");
    }

    // Modelleri ve ilişkileri kontrol et
    console.log("\n🔄 Model ilişkileri:");

    // Credits model ilişkisi
    const hasCredits = MoviesMetaData.associations.credits ? "✅" : "❌";
    console.log(`Film -> Credits ilişkisi: ${hasCredits}`);

    // Keywords model ilişkisi
    const hasKeywords = MoviesMetaData.associations.keywords ? "✅" : "❌";
    console.log(`Film -> Keywords ilişkisi: ${hasKeywords}`);

    return rows.length > 0;
  } catch (error) {
    console.error("❌ Veritabanı testi sırasında hata oluştu:", error);
    return false;
  } finally {
    // Bağlantıyı kapat
    await sequelize.close();
  }
}

// Testi çalıştır
testDb()
  .then((success) => {
    console.log("\n✅ Test tamamlandı.");
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("❌ Test sırasında beklenmeyen hata:", err);
    process.exit(1);
  });
