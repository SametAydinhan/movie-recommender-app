import React from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

interface MovieMenuProps {
  isOpen: boolean;
  movieId: number;
  isWatched: boolean;
  isInWatchlist?: boolean;
  onWatchedToggle: (e: React.MouseEvent, movieId: number) => void;
  onAddToWatchlist?: (e: React.MouseEvent, movieId: number) => void;
}

const MovieMenu: React.FC<MovieMenuProps> = ({
  isOpen,
  movieId,
  isWatched,
  isInWatchlist,
  onWatchedToggle,
  onAddToWatchlist,
}) => {
  if (!isOpen) return null;

  return (
    <div className='dropdown-menu absolute top-12 right-2 w-48 bg-white rounded-md shadow-lg z-40 overflow-hidden'>
      <button
        onClick={(e) => onWatchedToggle(e, movieId)}
        className='w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center'
      >
        {isWatched ? (
          <>
            <FaTimes className='w-4 h-4 mr-2 text-red-500' />
            İzlediklerimden Çıkar
          </>
        ) : (
          <>
            <FaCheck className='w-4 h-4 mr-2 text-green-500' />
            İzlediklerime Ekle
          </>
        )}
      </button>
    </div>
  );
};

export default MovieMenu;
