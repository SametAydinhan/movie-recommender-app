import pandas as pd
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, Float, String, Text, Boolean, Date, ForeignKey, inspect
import zipfile
import os
import json
import sys
from dotenv import load_dotenv
from sqlalchemy import text
from datetime import datetime

# .env dosyasını yükle
load_dotenv()

# MySQL veritabanı bağlantısı
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')

engine = create_engine(f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}')

# Proje dizini ve veri dizini
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.abspath(os.path.join(PROJECT_DIR, '..', 'the-movie-datasets'))
print(f"Veri dizini: {data_dir}")

# Dizin içeriğini kontrol et
if os.path.exists(data_dir):
    print(f"Veri dizini içeriği: {os.listdir(data_dir)}")
else:
    print(f"Veri dizini bulunamadı: {data_dir}")
    sys.exit(1)

def drop_all_tables():
    """Tüm tabloları sil"""
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        conn.execute(text("DROP TABLE IF EXISTS movies_metadata"))
        conn.execute(text("DROP TABLE IF EXISTS links"))
        conn.execute(text("DROP TABLE IF EXISTS keywords"))
        conn.execute(text("DROP TABLE IF EXISTS credits"))
        conn.execute(text("DROP TABLE IF EXISTS usermovies"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        conn.commit()
    print("Tüm tablolar silindi")

def create_tables():
    """Model yapısına uygun tablolar oluştur"""
    metadata = MetaData()
    
    # Movies Metadata tablosunu oluştur (MoviesMetaData modeline uygun)
    movies_metadata = Table(
        'movies_metadata', 
        metadata,
        Column('id', Integer, primary_key=True),
        Column('adult', Boolean, nullable=True),
        Column('belongs_to_collection', Text, nullable=True),
        Column('budget', Float, nullable=True),
        Column('genres', Text, nullable=True),
        Column('homepage', Text, nullable=True),
        Column('imdb_id', String(20), nullable=True),
        Column('original_language', String(10), nullable=True),
        Column('original_title', Text, nullable=True),
        Column('overview', Text, nullable=True),
        Column('popularity', Float, nullable=True),
        Column('poster_path', String(255), nullable=True),
        Column('production_companies', Text, nullable=True),
        Column('production_countries', Text, nullable=True),
        Column('release_date', Date, nullable=True),
        Column('revenue', Float, nullable=True),
        Column('runtime', Float, nullable=True),
        Column('spoken_languages', Text, nullable=True),
        Column('status', String(50), nullable=True),
        Column('tagline', Text, nullable=True),
        Column('title', Text, nullable=True),
        Column('video', Boolean, nullable=True),
        Column('vote_average', Float, nullable=True),
        Column('vote_count', Integer, nullable=True)
    )
    
    # Links tablosunu oluştur
    links = Table(
        'links',
        metadata,
        Column('movieId', Integer, primary_key=True),
        Column('imdbId', String(20), nullable=True),
        Column('tmdbId', String(20), nullable=True)
    )
    
    # Keywords tablosunu oluştur
    keywords = Table(
        'keywords',
        metadata,
        Column('id', Integer, primary_key=True),
        Column('keywords', Text, nullable=True)
    )
    
    # Credits tablosunu oluştur
    credits = Table(
        'credits',
        metadata,
        Column('id', Integer, primary_key=True),
        Column('cast', Text, nullable=True),
        Column('crew', Text, nullable=True)
    )
    
    # Tabloları oluştur
    metadata.create_all(engine)
    print("Tablolar başarıyla oluşturuldu")

def clean_json_columns(df, json_columns):
    """JSON sütunlarını temizler ve string formatına dönüştürür"""
    for col in json_columns:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: json.dumps(x) if pd.notna(x) else None)
    return df

def convert_data_types(df, table_name):
    """DataFrame veri tiplerini düzeltir"""
    if table_name == 'movies_metadata':
        # ID'yi integer olarak dönüştür
        if 'id' in df.columns:
            df['id'] = pd.to_numeric(df['id'], errors='coerce')
        
        # Boolean alanları düzenle
        if 'adult' in df.columns:
            df['adult'] = df['adult'].map({'True': True, 'False': False, True: True, False: False})
            
        if 'video' in df.columns:
            df['video'] = df['video'].map({'True': True, 'False': False, True: True, False: False})
        
        # Sayısal alanları dönüştür
        for col in ['budget', 'popularity', 'revenue', 'runtime', 'vote_average', 'vote_count']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
        # Tarih alanını dönüştür
        if 'release_date' in df.columns:
            df['release_date'] = pd.to_datetime(df['release_date'], errors='coerce')
    
    elif table_name == 'links':
        # movieId integer olmalı
        if 'movieId' in df.columns:
            df['movieId'] = pd.to_numeric(df['movieId'], errors='coerce')
    
    elif table_name == 'keywords' or table_name == 'credits':
        # id integer olmalı
        if 'id' in df.columns:
            df['id'] = pd.to_numeric(df['id'], errors='coerce')
            
    return df

def remove_duplicates(df, id_column):
    """Dataframe'den tekrarlayan ID'leri temizle"""
    # NaN değerleri içeren kayıtları filtrele
    df = df.dropna(subset=[id_column])
    
    # ID'yi sayısal formata çevir
    df[id_column] = pd.to_numeric(df[id_column], errors='coerce')
    
    # Tekrar eden ID'leri kontrol et ve rapor ver
    duplicate_count = df.duplicated(subset=[id_column]).sum()
    if duplicate_count > 0:
        print(f"{duplicate_count} adet tekrarlayan {id_column} değeri bulundu ve kaldırılıyor.")
        df = df.drop_duplicates(subset=[id_column], keep='first')
    
    return df

def import_movies_metadata(csv_file):
    try:
        csv_path = os.path.join(data_dir, csv_file)
        print(f"CSV dosyası kontrol ediliyor: {csv_path}")
        
        if not os.path.exists(csv_path):
            print(f"Hata: CSV dosyası bulunamadı: {csv_path}")
            return None
            
        with zipfile.ZipFile(csv_path, 'r') as zip_ref:
            csv_filename = csv_file.replace('.zip', '')
            zip_ref.extract(csv_filename, data_dir)
            extracted_path = os.path.join(data_dir, csv_filename)
            print(f"CSV çıkarıldı: {extracted_path}")
            
            df = pd.read_csv(extracted_path, low_memory=False)
            print(f"CSV yüklendi, satır sayısı: {len(df)}")
            
            # Geçici dosyayı sil
            os.remove(extracted_path)
        
        # NaN değerleri temizle
        df = df.fillna('')
        
        # JSON sütunları temizle
        json_columns = ['genres', 'production_companies', 'production_countries', 'spoken_languages', 'belongs_to_collection']
        df = clean_json_columns(df, json_columns)
        
        # Gereksiz sütunları kaldır
        if 'Unnamed: 0' in df.columns:
            df = df.drop('Unnamed: 0', axis=1)
        
        # Veri tiplerini düzelt
        df = convert_data_types(df, 'movies_metadata')
        
        # Tekrar eden verileri temizle
        df = remove_duplicates(df, 'id')
        
        # Verileri veritabanına aktar
        print("Veritabanına aktarılıyor...")
        df.to_sql('movies_metadata', engine, if_exists='append', index=False)
        print("movies_metadata tablosu başarıyla oluşturuldu ve veriler aktarıldı.")
        
        return df
    except Exception as e:
        print(f"movies_metadata yüklenirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def import_links(csv_file, movies_df):
    try:
        csv_path = os.path.join(data_dir, csv_file)
        print(f"Links dosyası kontrol ediliyor: {csv_path}")
        
        if not os.path.exists(csv_path):
            print(f"Hata: Links dosyası bulunamadı: {csv_path}")
            return False
            
        df = pd.read_csv(csv_path)
        print(f"Links yüklendi, satır sayısı: {len(df)}")
        
        # Veri tiplerini düzelt
        df = convert_data_types(df, 'links')
            
        # Eğer movies_df'te id sütunu varsa, sadece eşleşen ID'leri al
        if movies_df is not None and 'id' in movies_df.columns:
            valid_ids = movies_df['id'].dropna().astype(int).tolist()
            if valid_ids:
                df = df[df['movieId'].isin(valid_ids)]
        
        # Tekrar eden verileri temizle
        df = remove_duplicates(df, 'movieId')
        
        # Verileri veritabanına aktar
        print("Links veritabanına aktarılıyor...")
        df.to_sql('links', engine, if_exists='append', index=False)
        print("links tablosu başarıyla oluşturuldu ve veriler aktarıldı.")
        return True
    except Exception as e:
        print(f"links yüklenirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def import_keywords(csv_file, movies_df):
    try:
        csv_path = os.path.join(data_dir, csv_file)
        print(f"Keywords dosyası kontrol ediliyor: {csv_path}")
        
        if not os.path.exists(csv_path):
            print(f"Hata: Keywords dosyası bulunamadı: {csv_path}")
            return False
            
        with zipfile.ZipFile(csv_path, 'r') as zip_ref:
            csv_filename = csv_file.replace('.zip', '')
            zip_ref.extract(csv_filename, data_dir)
            extracted_path = os.path.join(data_dir, csv_filename)
            print(f"Keywords CSV çıkarıldı: {extracted_path}")
            
            df = pd.read_csv(extracted_path)
            print(f"Keywords yüklendi, satır sayısı: {len(df)}")
            
            # Geçici dosyayı sil
            os.remove(extracted_path)
        
        # Veri tiplerini düzelt
        df = convert_data_types(df, 'keywords')
            
        # Eğer movies_df'te id sütunu varsa, sadece eşleşen ID'leri al
        if movies_df is not None and 'id' in movies_df.columns:
            valid_ids = movies_df['id'].dropna().astype(int).tolist()
            if valid_ids:
                df = df[df['id'].isin(valid_ids)]
        
        # Tekrar eden verileri temizle
        df = remove_duplicates(df, 'id')
        
        # JSON sütunlarını temizle
        df = clean_json_columns(df, ['keywords'])
        
        # Verileri veritabanına aktar
        print("Keywords veritabanına aktarılıyor...")
        df.to_sql('keywords', engine, if_exists='append', index=False)
        print("keywords tablosu başarıyla oluşturuldu ve veriler aktarıldı.")
        return True
    except Exception as e:
        print(f"keywords yüklenirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def import_credits(csv_file, movies_df):
    try:
        csv_path = os.path.join(data_dir, csv_file)
        print(f"Credits dosyası kontrol ediliyor: {csv_path}")
        
        if not os.path.exists(csv_path):
            print(f"Hata: Credits dosyası bulunamadı: {csv_path}")
            return False
            
        with zipfile.ZipFile(csv_path, 'r') as zip_ref:
            csv_filename = csv_file.replace('.zip', '')
            zip_ref.extract(csv_filename, data_dir)
            extracted_path = os.path.join(data_dir, csv_filename)
            print(f"Credits CSV çıkarıldı: {extracted_path}")
            
            df = pd.read_csv(extracted_path)
            print(f"Credits yüklendi, satır sayısı: {len(df)}")
            
            # Geçici dosyayı sil
            os.remove(extracted_path)
        
        # Veri tiplerini düzelt
        df = convert_data_types(df, 'credits')
            
        # Eğer movies_df'te id sütunu varsa, sadece eşleşen ID'leri al
        if movies_df is not None and 'id' in movies_df.columns:
            valid_ids = movies_df['id'].dropna().astype(int).tolist()
            if valid_ids:
                df = df[df['id'].isin(valid_ids)]
        
        # Tekrar eden verileri temizle
        df = remove_duplicates(df, 'id')
        
        # JSON sütunlarını temizle
        df = clean_json_columns(df, ['cast', 'crew'])
        
        # Verileri veritabanına aktar
        print("Credits veritabanına aktarılıyor...")
        df.to_sql('credits', engine, if_exists='append', index=False)
        print("credits tablosu başarıyla oluşturuldu ve veriler aktarıldı.")
        return True
    except Exception as e:
        print(f"credits yüklenirken hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Ana yükleme işlemi
def main():
    # Parametreleri kontrol et
    force_mode = "--force" in sys.argv
    
    print("Verileri yükleme işlemi başlatılıyor...")
    
    success = True
    
    try:
        # Tüm tabloları sil
        drop_all_tables()
        
        # Tabloları oluştur
        create_tables()
        
        # Verileri yükle
        print("1. Movies Metadata yükleniyor...")
        movies_df = import_movies_metadata('movies_metadata.csv.zip')
        if movies_df is None:
            if not force_mode:
                print("Movies Metadata yüklenemedi, devam etmek istiyor musunuz? (E/H)")
                choice = input().strip().upper()
                if choice != 'E':
                    return
            else:
                print("Movies Metadata yüklenemedi, force mode etkin - devam ediliyor.")
                
        print("2. Links yükleniyor...")
        if not import_links('links.csv', movies_df):
            if not force_mode:
                print("Links yüklenemedi, devam etmek istiyor musunuz? (E/H)")
                choice = input().strip().upper()
                if choice != 'E':
                    return
            else:
                print("Links yüklenemedi, force mode etkin - devam ediliyor.")
                
        print("3. Keywords yükleniyor...")
        if not import_keywords('keywords.csv.zip', movies_df):
            if not force_mode:
                print("Keywords yüklenemedi, devam etmek istiyor musunuz? (E/H)")
                choice = input().strip().upper()
                if choice != 'E':
                    return
            else:
                print("Keywords yüklenemedi, force mode etkin - devam ediliyor.")
                
        print("4. Credits yükleniyor...")
        if not import_credits('credits.csv.zip', movies_df):
            print("Credits yüklenemedi.")
            success = False
            
        if success:
            print("Tüm veriler başarıyla yüklendi!")
        else:
            print("Bazı veriler yüklenemedi, ancak işlem tamamlandı.")
            
    except Exception as e:
        print(f"Ana yükleme işleminde hata oluştu: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 