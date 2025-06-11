import React from "react";
import { Movie } from "@/lib/types";
import AllMovieCard from "./AllMovieCard";

interface MovieListProps {
  movies: Movie[];
  isLoading: boolean;
  posters: { [key: number]: string };
  imageLoadingStates: { [key: number]: boolean };
  watchedMovies: number[];
  watchlistMovies: number[];
  openMenu: number | null;
  onToggleMenu: (e: React.MouseEvent, movieId: number) => void;
  onWatchedToggle: (e: React.MouseEvent, movieId: number) => void;
  onAddToWatchlist: (e: React.MouseEvent, movieId: number) => void;
  showSimilarity?: boolean;
}

const MovieList: React.FC<MovieListProps> = ({
  movies,
  isLoading,
  posters,
  imageLoadingStates,
  watchedMovies,
  watchlistMovies,
  openMenu,
  onToggleMenu,
  onWatchedToggle,
  onAddToWatchlist,
  showSimilarity = false,
}) => {
  if (isLoading) {
    return (
      <div className='flex justify-center items-center py-20'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500'></div>
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
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
      {movies.map((movie) => (
        <AllMovieCard
          key={movie.id}
          movie={movie}
          posterUrl={posters[movie.id] || ""}
          isLoading={imageLoadingStates[movie.id] || false}
          isWatched={watchedMovies.includes(movie.id)}
          isInWatchlist={watchlistMovies.includes(movie.id)}
          isMenuOpen={openMenu === movie.id}
          onToggleMenu={onToggleMenu}
          onWatchedToggle={onWatchedToggle}
          onAddToWatchlist={onAddToWatchlist}
          showSimilarity={showSimilarity}
        />
      ))}
    </div>
  );
};

export default MovieList;
