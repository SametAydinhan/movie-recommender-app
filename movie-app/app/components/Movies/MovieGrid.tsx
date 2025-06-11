import React from "react";
import MovieCard from "./MovieCard";

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
}

interface MovieGridProps {
  movies: Movie[];
  isLoading: boolean;
  posters: { [key: number]: string };
  imageLoadingStates: { [key: number]: boolean };
  openMenu: number | null;
  onToggleMenu: (e: React.MouseEvent, movieId: number) => void;
  onRemoveFromWatchlist: (e: React.MouseEvent, movieId: number) => void;
}

const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  isLoading,
  posters,
  imageLoadingStates,
  openMenu,
  onToggleMenu,
  onRemoveFromWatchlist,
}) => {
  if (isLoading) {
    return (
      <div className='flex justify-center items-center py-20'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className='col-span-full text-center py-10'>
        <p className='text-white text-xl'>Film bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          posterUrl={posters[movie.id] || ""}
          isLoading={imageLoadingStates[movie.id] || false}
          isMenuOpen={openMenu === movie.id}
          onToggleMenu={onToggleMenu}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
        />
      ))}
    </div>
  );
};

export default MovieGrid;
