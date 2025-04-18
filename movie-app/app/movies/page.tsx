"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaStar, FaStarHalf, FaRegStar } from "react-icons/fa";

interface Movie {
  imdbID: string;
  Title: string;
  Poster: string;
  imdbRating: string;
  Year: string;
  Type: string;
}

interface MovieDetails {
  imdbID: string;
  imdbRating: string;
}

const Movies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [movieRatings, setMovieRatings] = useState<{ [key: string]: string }>(
    {}
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("movie");

  const API_KEY = "3dd9e9e9";
  const MOVIES_PER_PAGE = 20;

  // Yıldız sayısını hesaplayan yardımcı fonksiyon
  const getStarRating = (rating: string) => {
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating / 2);
    const hasHalfStar = numRating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className='flex items-center'>
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={`full_${i}`} className='text-yellow-400 w-3 h-3' />
        ))}
        {hasHalfStar && <FaStarHalf className='text-yellow-400 w-3 h-3  ' />}
        {[...Array(emptyStars)].map((_, i) => (
          <FaRegStar key={`empty_${i}`} className='text-yellow-400 w-3 h-3' />
        ))}
      </div>
    );
  };

  // Film detaylarını getiren fonksiyon
  const fetchMovieRating = async (imdbID: string) => {
    try {
      const response = await fetch(
        `http://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}`
      );
      const data = await response.json();
      if (data.Response === "True" && data.imdbRating !== "N/A") {
        setMovieRatings((prev) => ({
          ...prev,
          [imdbID]: data.imdbRating,
        }));
      }
    } catch (error) {
      console.error("Error fetching movie rating:", error);
    }
  };

  const fetchMovies = async (page: number) => {
    try {
      const response = await fetch(
        `http://www.omdbapi.com/?apikey=${API_KEY}&s=${searchTerm}&type=movie&page=${page}`
      );
      const data = await response.json();

      if (data.Response === "True") {
        setMovies(data.Search);
        setTotalPages(Math.ceil(parseInt(data.totalResults) / MOVIES_PER_PAGE));

        // Her film için rating bilgisini al
        data.Search.forEach((movie: Movie) => {
          fetchMovieRating(movie.imdbID);
        });
      } else {
        console.error("API Error:", data.Error);
        setMovies([]);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };

  useEffect(() => {
    fetchMovies(currentPage);
  }, [currentPage]);

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <h1 className='text-3xl font-bold text-center text-white mb-8'>
        Tüm Filmler
      </h1>

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'>
        {movies.map((movie) => (
          <Link
            href={`/movies/${movie.imdbID}`}
            key={movie.imdbID}
            className='group bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:-translate-y-2'
          >
            <div className='relative'>
              <Image
                src={movie.Poster !== "N/A" ? movie.Poster : "/no-image.jpg"}
                alt={movie.Title}
                width={200}
                height={300}
                className='w-full h-[300px] object-cover'
              />
            </div>
            <div className='p-4'>
              <h3 className='text-lg font-semibold text-gray-800 truncate'>
                {movie.Title}
              </h3>
              <div className='flex items-center justify-between mt-2'>
                {movieRatings[movie.imdbID] && (
                  <div className='flex items-center gap-1'>
                    {getStarRating(movieRatings[movie.imdbID])}
                    <span className='text-sm text-gray-600 ml-1'>
                      ({movieRatings[movie.imdbID]})
                    </span>
                  </div>
                )}
                <span className='text-sm text-gray-600'>{movie.Year}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className='flex justify-center items-center space-x-4 mt-8'>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-md transition-colors duration-200
            ${
              currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
        >
          Önceki
        </button>
        <span className='text-white'>
          Sayfa {currentPage} / {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-md transition-colors duration-200
            ${
              currentPage === totalPages
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
        >
          Sonraki
        </button>
      </div>
    </div>
  );
};

export default Movies;
