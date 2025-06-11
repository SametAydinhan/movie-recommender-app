import React from "react";
import { FaEye, FaStopwatch } from "react-icons/fa";
import { formatWatchTime } from "@/lib/utils/formatters";

interface WatchedMoviesHeaderProps {
  totalMovies: number;
  totalWatchTime: number;
  watchTimeFormatted?: string;
}

const WatchedMoviesHeader: React.FC<WatchedMoviesHeaderProps> = ({
  totalMovies,
  totalWatchTime,
  watchTimeFormatted,
}) => {
  const formattedTime = watchTimeFormatted || formatWatchTime(totalWatchTime);

  return (
    <div className='flex flex-col md:flex-row justify-between items-center mb-12'>
      <div className='flex flex-col mb-4 md:mb-0'>
        <h1 className='text-4xl font-bold text-white mb-2'>
          İzlediğim Filmler
        </h1>
        <div className='flex flex-wrap gap-4 items-center mt-2'>
          <span className='bg-blue-900 text-blue-100 px-3 py-1 rounded-md flex items-center'>
            <FaEye className='mr-2' />
            {totalMovies} film
          </span>
          <span className='bg-green-900 text-green-100 px-3 py-1 rounded-md flex items-center'>
            <FaStopwatch className='mr-2' />
            Toplam: {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WatchedMoviesHeader;
