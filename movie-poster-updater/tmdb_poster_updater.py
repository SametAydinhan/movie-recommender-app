import requests
import pymysql
import logging

# Log ayarlamaları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# TMDB API Anahtarı
TMDB_API_KEY = '1cfa70500bbb87dd6f9cb169ade564c6'

# Veritabanı bağlantı bilgileri
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'movie_app',
    'charset': 'utf8mb4'
}

def get_all_movies():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = "SELECT id, title, original_title, release_date, poster_path FROM movies_metadata"
            cursor.execute(sql)
            return cursor.fetchall()
    finally:
        connection.close()

def get_tmdb_poster_path(title, year=None):
    params = {
        'api_key': TMDB_API_KEY,
        'query': title,
        'include_adult': 'false'
    }
    if year:
        params['year'] = year
    try:
        response = requests.get('https://api.themoviedb.org/3/search/movie', params=params)
        response.raise_for_status()
        data = response.json()
        if data['results']:
            # Yıla tam uyanı bul
            for result in data['results']:
                if year and result.get('release_date', '').startswith(str(year)):
                    return result.get('poster_path')
            # Yoksa ilk posteri döndür
            return data['results'][0].get('poster_path')
    except Exception as e:
        logging.error(f"TMDb arama hatası: {e}")
    return None

def update_poster_in_db(movie_id, poster_path):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            sql = "UPDATE movies_metadata SET poster_path = %s WHERE id = %s"
            cursor.execute(sql, (poster_path, movie_id))
        connection.commit()
        logging.info(f"Poster güncellendi: {movie_id} -> {poster_path}")
    except Exception as e:
        logging.error(f"Poster güncelleme hatası: {e}")
    finally:
        connection.close()

def main():
    movies = get_all_movies()
    for movie in movies:
        search_titles = []
        if movie['title']:
            search_titles.append(movie['title'])
        if movie['original_title'] and movie['original_title'] != movie['title']:
            search_titles.append(movie['original_title'])
        year = None
        if movie['release_date'] and len(str(movie['release_date'])) >= 4:
            year = str(movie['release_date'])[:4]
        tmdb_poster = None
        for title in search_titles:
            tmdb_poster = get_tmdb_poster_path(title, year)
            if tmdb_poster:
                break
        if tmdb_poster and tmdb_poster != movie['poster_path']:
            update_poster_in_db(movie['id'], tmdb_poster)
        else:
            logging.info(f"Poster zaten güncel veya bulunamadı: {movie['title']}")

if __name__ == "__main__":
    main()
