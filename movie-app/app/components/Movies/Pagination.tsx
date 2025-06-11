import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  // Gösterilecek sayfa numaralarını hesapla
  const visiblePageCount = 5; // Toplam görünecek sayfa numarası sayısı (1, 2, 3, ..., 19, 20)
  const sidePageCount = 1; // Başta ve sonda kaç sayfa gösterileceği (1, ..., 19, 20)

  // Sayfa numaralarını oluştur
  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];

    // Sayfa sayısı az ise hepsini göster
    if (totalPages <= visiblePageCount) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }

    // İlk sayfaları ekle
    for (let i = 1; i <= sidePageCount; i++) {
      pageNumbers.push(i);
    }

    // Ortadaki sayfaları ekle
    const middleStart = Math.max(sidePageCount + 1, currentPage - 1);
    const middleEnd = Math.min(totalPages - sidePageCount, currentPage + 1);

    // Sol taraftaki boşluk kontrolü
    if (middleStart > sidePageCount + 1) {
      pageNumbers.push("...");
    }

    // Mevcut sayfa ve çevresindeki sayfaları ekle
    for (let i = middleStart; i <= middleEnd; i++) {
      pageNumbers.push(i);
    }

    // Sağ taraftaki boşluk kontrolü
    if (middleEnd < totalPages - sidePageCount) {
      pageNumbers.push("...");
    }

    // Son sayfaları ekle
    for (let i = totalPages - sidePageCount + 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  return (
    <div className='flex justify-center items-center mt-12 mb-8'>
      <div className='inline-flex bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-full px-2 py-1 space-x-1'>
        {/* Önceki buton */}
        <button
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='px-2 py-1 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
          aria-label='Önceki sayfa'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
        </button>

        {/* Sayfa numaraları */}
        {getPageNumbers().map((page, index) =>
          typeof page === "number" ? (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {page}
            </button>
          ) : (
            <span
              key={index}
              className='w-8 h-8 flex items-center justify-center text-gray-400'
            >
              {page}
            </span>
          )
        )}

        {/* Sonraki buton */}
        <button
          onClick={() =>
            currentPage < totalPages && onPageChange(currentPage + 1)
          }
          disabled={currentPage === totalPages}
          className='px-2 py-1 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
          aria-label='Sonraki sayfa'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5l7 7-7 7'
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
