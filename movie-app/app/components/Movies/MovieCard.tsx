import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaStopwatch, FaTrash } from "react-icons/fa";
import { formatDate, getStarRating } from "@/lib/utils/formatters";
import { handleImageError } from "@/lib/utils/image";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  runtime: number;
  overview: string;
  genres: string[] | string;
  watched_at?: string;
  poster_url?: string;
}

interface MovieCardProps {
  movie: Movie;
  posterUrl: string;
  isLoading: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent, movieId: number) => void;
  onRemoveFromWatchlist: (e: React.MouseEvent, movieId: number) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  posterUrl,
  isLoading,
  isMenuOpen,
  onToggleMenu,
  onRemoveFromWatchlist,
}) => {
  return (
    <div key={movie.id} className='relative group'>
      <Link
        href={`/movies/${movie.id}`}
        className='block bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:-translate-y-2'
      >
        <div className='relative w-full h-[300px]'>
          {/* Yükleme durumu göstergesi */}
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-200'>
              <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
            </div>
          )}

          {/* Film posteri */}
          {(posterUrl || movie.poster_url) && (
            <div
              className={`w-full h-full transition-opacity duration-300 ${
                isLoading ? "opacity-0" : "opacity-100"
              }`}
            >
              <Image
                src={movie.poster_url || posterUrl || "/No-Poster.png"}
                alt={movie.title}
                fill
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                style={{ objectFit: "cover" }}
                className='w-full h-full transition-opacity duration-300'
                onError={handleImageError}
                unoptimized
              />
            </div>
          )}

          {/* Üç nokta menü butonu */}
          <button
            onClick={(e) => onToggleMenu(e, movie.id)}
            className='menu-button absolute top-2 right-2 w-8 h-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white hover:bg-opacity-70 z-30'
            aria-label='Menüyü aç'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M10 2a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4zm0 6a2 2 0 110 4 2 2 0 010-4z'
                clipRule='evenodd'
              />
            </svg>
          </button>

          {/* İzlendi işareti */}
          <div className='absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
            İzlendi
          </div>

          {/* İzleme tarihi işareti */}
          {movie.watched_at && (
            <div className='absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs py-1 px-2 rounded z-10'>
              İzlenme: {formatDate(movie.watched_at)}
            </div>
          )}

          {/* Açılır menü */}
          {isMenuOpen && (
            <div className='dropdown-menu absolute top-12 right-2 w-48 bg-white rounded-md shadow-lg z-40 overflow-hidden'>
              <button
                onClick={(e) => onRemoveFromWatchlist(e, movie.id)}
                className='w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center'
              >
                <FaTrash className='w-4 h-4 mr-2' />
                İzlenenlerden Çıkar
              </button>
            </div>
          )}
        </div>
        <div className='p-4'>
          {/* Film başlığı */}
          <h3
            className='text-lg font-semibold text-gray-800 truncate mb-2'
            title={movie.title}
          >
            {movie.title}
          </h3>

          {/* Puan yıldızları */}
          <div className='flex items-center mb-2'>
            {getStarRating(movie.vote_average || 0)}
            <span className='text-sm text-gray-600 ml-1'>
              ({(movie.vote_average || 0).toFixed(1)})
            </span>
          </div>

          {/* Tarih ve Süre - yeni stilde */}
          <div className='text-sm text-gray-600 mb-1 flex flex-wrap gap-2'>
            <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block'>
              {formatDate(movie.release_date)}
            </span>
            {movie.runtime > 0 && (
              <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block flex items-center'>
                <FaStopwatch className='mr-1' size={10} /> {movie.runtime} dk
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default MovieCard;
