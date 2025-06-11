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
with engine.connect() as conn:
    conn.execute(text('SET FOREIGN_KEY_CHECKS = 0'))
    conn.commit()
    print('Foreign key kontrolleri devre dışı bırakıldı')
