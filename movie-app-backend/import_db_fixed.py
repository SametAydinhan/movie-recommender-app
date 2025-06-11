import pandas as pd
from sqlalchemy import create_engine, text
import zipfile, os, json
from dotenv import load_dotenv
load_dotenv()
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME')
engine = create_engine(f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}')
print('Veritabanına bağlanılıyor...')
try:
    # Foreign key kontrolleri devre dışı bırak
    with engine.connect() as conn:
        conn.execute(text('DROP TABLE IF EXISTS movies_metadata'))
        conn.execute(text('DROP TABLE IF EXISTS keywords'))
        conn.execute(text('DROP TABLE IF EXISTS credits'))
        conn.execute(text('DROP TABLE IF EXISTS links'))
        conn.commit()
        print('Tablolar silindi')
except Exception as e:
    print(f'Hata: {e}')
# CSV'leri tabloya yükleyen fonksiyon
def create_and_populate_table(csv_file, table_name, zip_file=False, dtype=None):
    try:
        if zip_file:
            with zipfile.ZipFile(os.path.join('../the-movie-datasets', csv_file), 'r') as zip_ref:
                csv_filename = csv_file.replace('.zip', '')
                zip_ref.extract(csv_filename, '../the-movie-datasets')
                df = pd.read_csv(os.path.join('../the-movie-datasets', csv_filename), dtype=dtype)
                os.remove(os.path.join('../the-movie-datasets', csv_filename))
        else:
            df = pd.read_csv(os.path.join('../the-movie-datasets', csv_file), dtype=dtype)
        
        # NaN değerleri boş string ile değiştir
        df = df.fillna('')
        
        # DataFrame'i veritabanına yükle
        df.to_sql(table_name, engine, if_exists='replace', index=False)
        print(f'{table_name} tablosu oluşturuldu ve veriler yüklendi')
        
        return True
    except Exception as e:
        print(f'{table_name} tablosu yüklenirken hata oluştu: {e}')
        return False
# SV'leri tabloya yükleyen fonksiyon
def create_and_populate_table(csv_file, table_name, zip_file=False, dtype=None):
    try:
        if zip_file:
            with zipfile.ZipFile(os.path.join('../the-movie-datasets', csv_file), 'r') as zip_ref:
                csv_filename = csv_file.replace('.zip', '')
                zip_ref.extract(csv_filename, '../the-movie-datasets')
                df = pd.read_csv(os.path.join('../the-movie-datasets', csv_filename), dtype=dtype)
                os.remove(os.path.join('../the-movie-datasets', csv_filename))
        else:
            df = pd.read_csv(os.path.join('../the-movie-datasets', csv_file), dtype=dtype)
        
        # NaN değerleri boş string ile değiştir
        df = df.fillna('')
        
        # DataFrame'i veritabanına yükle
        df.to_sql(table_name, engine, if_exists='replace', index=False)
        print(f'{table_name} tablosu oluşturuldu ve veriler yüklendi')
        
        return True
    except Exception as e:
        print(f'{table_name} tablosu yüklenirken hata oluştu: {e}')
        return False
