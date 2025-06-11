import React from "react";
import Link from "next/link";
import { FaEye } from "react-icons/fa";

const EmptyWatchedList: React.FC = () => {
  return (
    <div className='min-h-screen pb-16'>
      <div className='max-w-7xl mx-auto px-4 pt-16'>
        <div className='flex flex-col md:flex-row justify-between items-center mb-12'>
          <div className='flex flex-col mb-4 md:mb-0'>
            <h1 className='text-4xl font-bold text-white mb-2'>
              İzlediğim Filmler
            </h1>
            <p className='text-gray-400'>
              Henüz izlediğiniz bir film bulunmuyor.
            </p>
          </div>
        </div>

        <div className='flex flex-col items-center justify-center py-12 px-4'>
          <div className='bg-gray-800 rounded-lg p-8 text-center max-w-lg'>
            <FaEye className='w-16 h-16 text-blue-400 mx-auto mb-4' />
            <h2 className='text-2xl font-bold text-white mb-4'>
              İzleme listeniz boş
            </h2>
            <p className='text-gray-400 mb-6'>
              Henüz izlediğiniz bir film bulunmuyor. Filmleri keşfedin ve izleme
              listenize ekleyin.
            </p>
            <Link
              href='/movies'
              className='inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors'
            >
              Filmleri Keşfet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyWatchedList;
