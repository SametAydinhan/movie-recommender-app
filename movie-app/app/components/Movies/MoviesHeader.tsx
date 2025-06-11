import React from "react";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";

interface MoviesHeaderProps {
  searchTerm: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  contentLoading: boolean;
}

const MoviesHeader: React.FC<MoviesHeaderProps> = ({
  searchTerm,
  onSearch,
  onSubmit,
  searchInputRef,
  contentLoading,
}) => {
  return (
    <div className='flex flex-col md:flex-row justify-between items-center mb-12'>
      <div className='flex flex-col mb-4 md:mb-0'>
        <h1 className='text-4xl font-bold text-white mb-2'>Tüm Filmler</h1>
        <div className='flex space-x-4 mt-2'>
          <Link
            href='/my-movies'
            className='text-green-400 hover:text-green-300 flex items-center'
          >
            <span className='bg-green-600 rounded-full w-4 h-4 mr-2 flex items-center justify-center text-xs'>
              ✓
            </span>
            İzlediklerim
          </Link>
        </div>
      </div>

      {/* Arama formu */}
      <form onSubmit={onSubmit} className='relative w-full md:w-96'>
        <input
          type='text'
          placeholder='Film adına göre ara...'
          value={searchTerm}
          onChange={onSearch}
          className='w-full px-4 py-3 pl-10 rounded-full bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
          ref={searchInputRef}
          autoFocus
        />
        <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
        {contentLoading && (
          <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
            <div className='animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent'></div>
          </div>
        )}
      </form>
    </div>
  );
};

export default MoviesHeader;
