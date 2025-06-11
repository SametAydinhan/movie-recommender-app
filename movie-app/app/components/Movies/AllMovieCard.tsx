import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Movie } from "@/lib/types";
import MovieMenu from "./MovieMenu";
import { formatDate, getStarRating } from "@/lib/utils/formatters";
import { handleImageError } from "@/lib/utils/image";
import {
  FaEllipsisV,
  FaStar,
  FaRegStar,
  FaCheck,
  FaPlus,
} from "react-icons/fa";
import { toast } from "react-hot-toast";

interface AllMovieCardProps {
  movie: Movie;
  posterUrl: string;
  isLoading: boolean;
  isWatched: boolean;
  isInWatchlist: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent, movieId: number) => void;
  onWatchedToggle: (e: React.MouseEvent, movieId: number) => void;
  onAddToWatchlist?: (e: React.MouseEvent, movieId: number) => void;
  showSimilarity?: boolean;
}

const AllMovieCard: React.FC<AllMovieCardProps> = ({
  movie,
  posterUrl,
  isLoading,
  isWatched,
  isInWatchlist,
  isMenuOpen,
  onToggleMenu,
  onWatchedToggle,
  onAddToWatchlist,
  showSimilarity = false,
}) => {
  // Benzerlik renk stili hesaplama - Yeni stil sınıfları
  const getSimilarityColorStyle = (similarityValue: number) => {
    // Benzerlik değerine göre renk belirleme - daha geniş aralıklar için farklı renkler
    if (similarityValue >= 0.85) {
      return "bg-purple-600 bg-opacity-95 shadow-md shadow-purple-600/50 border-2 border-purple-400"; // Çok yüksek benzerlik
    } else if (similarityValue >= 0.7) {
      return "bg-emerald-600 bg-opacity-95 shadow-md shadow-emerald-600/50 border-2 border-emerald-400"; // Yüksek benzerlik
    } else if (similarityValue >= 0.55) {
      return "bg-green-600 bg-opacity-95 shadow-md shadow-green-600/50 border-2 border-green-400"; // İyi benzerlik
    } else if (similarityValue >= 0.4) {
      return "bg-yellow-500 bg-opacity-95 shadow-md shadow-yellow-500/50 border-2 border-yellow-400"; // Orta benzerlik
    } else if (similarityValue >= 0.25) {
      return "bg-orange-500 bg-opacity-95 shadow-md shadow-orange-500/50 border-2 border-orange-400"; // Düşük benzerlik
    } else {
      return "bg-red-500 bg-opacity-95 shadow-md shadow-red-500/50 border-2 border-red-400"; // Çok düşük benzerlik
    }
  };

  // Benzerlik değerini al - değerin doğru olduğundan emin ol
  const rawSimilarity = movie.similarity ?? movie.similarity_score ?? 0;
  // Konsolda değeri yazdır (debug için)
  console.log(
    `Film ${movie.id}: ${movie.title}, Benzerlik: ${rawSimilarity.toFixed(4)}`
  );
  // Yüzdelik değere çevir
  const similarityPercent = Math.round(rawSimilarity * 100);
  const colorStyle = getSimilarityColorStyle(rawSimilarity);

  return (
    <div className='relative group'>
      <Link
        href={`/movies/${movie.id}`}
        className='block bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:-translate-y-2'
      >
        <div className='relative w-full aspect-[2/3]'>
          {/* Yükleme durumu göstergesi */}
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-200'>
              <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500'></div>
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
                onError={(e) => {
                  // İlk hata sonrası TMDB'nin başka bir boyutunu dene
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes("w500")) {
                    console.log(
                      `Poster yükleme hatası (w500), original boyut deneniyor: ${movie.id}`
                    );
                    target.src = target.src.replace("w500", "original");
                  } else if (
                    target.src.includes("original") &&
                    !target.src.includes("No-Poster.png")
                  ) {
                    console.log(
                      `Poster yükleme hatası (original), varsayılan resim kullanılacak: ${movie.id}`
                    );
                    target.src = "/No-Poster.png";
                  } else {
                    console.log(
                      `Son çare - varsayılan resim kullanılıyor: ${movie.id}`
                    );
                    target.src = "/No-Poster.png";
                  }
                }}
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
            <FaEllipsisV />
          </button>

          {/* İzlendi işareti - Eğer izlenmişse */}
          {isWatched && (
            <div className='absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
              İzlendi
            </div>
          )}

          {/* İzleme listesinde işareti */}
          {isInWatchlist && !isWatched && (
            <div className='absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10'>
              İzleme Listemde
            </div>
          )}

          {/* Benzerlik oranı göstergesi - Daha belirgin stil */}
          {showSimilarity && rawSimilarity > 0 && (
            <div
              className={`absolute bottom-2 right-2 ${colorStyle} text-white px-3 py-1.5 rounded-lg text-sm font-extrabold z-20`}
              style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.6)" }}
            >
              %{similarityPercent}
            </div>
          )}

          {/* Açılır menü */}
          <MovieMenu
            isOpen={isMenuOpen}
            movieId={movie.id}
            isWatched={isWatched}
            isInWatchlist={isInWatchlist}
            onWatchedToggle={onWatchedToggle}
            onAddToWatchlist={onAddToWatchlist}
          />
        </div>
        <div className='p-4'>
          {/* Film başlığı */}
          <h3
            className='text-lg font-extrabold text-gray-900 truncate mb-2'
            title={movie.title}
          >
            {movie.title}
          </h3>

          {/* Puan yıldızları */}
          <div className='flex items-center mb-3'>
            {getStarRating(movie.vote_average || 0)}
            <span className='text-sm text-gray-600 ml-1'>
              ({(movie.vote_average || 0).toFixed(1)})
            </span>
          </div>

          {/* Tarih - yeni stilde */}
          <div className='text-sm text-gray-600 truncate'>
            <span className='bg-gray-100 px-2 py-1 rounded-md text-xs inline-block'>
              {formatDate(movie.release_date)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default AllMovieCard;
