"use client";
import React, { useState, useEffect } from "react";
import { getAuthToken } from "@/utils/auth";
import { FaFilm, FaChartPie, FaCalendarAlt, FaClock } from "react-icons/fa";

interface StatData {
  totalWatched: number;
  favoriteGenres: { name: string; count: number }[];
  watchTimeHours: number;
  recentlyWatched: { id: number; title: string; date: string }[];
}

export default function UserStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Giriş yapılmamış");
        }

        console.log(
          "İstatistik verilerini getirmek için API isteği yapılıyor..."
        );
        const response = await fetch(
          "http://localhost:3001/api/users/me/stats",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("API yanıtı:", response.status, response.statusText);

        if (!response.ok) {
          if (response.status === 404) {
            // İstatistikler henüz oluşturulmamış olabilir, varsayılan değerler kullan
            console.log("404 hatası - Varsayılan değerler kullanılıyor");
            setStats({
              totalWatched: 0,
              favoriteGenres: [],
              watchTimeHours: 0,
              recentlyWatched: [],
            });
            setLoading(false);
            return;
          }

          // Hata yanıtını ayrıntılı incele
          let errorText = "";
          try {
            const errorData = await response.json();
            console.log("API hata yanıtı:", errorData);
            errorText = errorData.message || `API Hatası: ${response.status}`;
          } catch (e) {
            errorText = `API Hatası: ${response.status}`;
          }

          throw new Error(errorText);
        }

        const data = await response.json();
        console.log("API başarılı yanıtı:", data);

        if (!data.stats) {
          console.error("API yanıtında stats objesi yok:", data);
          throw new Error("API yanıtında istatistik verileri bulunamadı");
        }

        setStats(data.stats);
      } catch (error: any) {
        console.error("İstatistikler alınırken hata:", error);
        setError(`Film istatistikleri yüklenemedi: ${error.message}`);

        // Hata durumunda boş veri göster
        setStats({
          totalWatched: 0,
          favoriteGenres: [],
          watchTimeHours: 0,
          recentlyWatched: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className='flex justify-center p-6'>
        <div className='animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-500 bg-opacity-20 text-red-300 p-4 rounded'>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className='bg-gray-800 rounded-lg p-6 shadow-lg'>
      <h2 className='text-2xl font-semibold mb-6'>Film İstatistiklerim</h2>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
        <div className='bg-gray-700 rounded-lg p-4 flex items-center gap-4'>
          <div className='bg-blue-600 rounded-full p-3'>
            <FaFilm className='text-white text-xl' />
          </div>
          <div>
            <p className='text-gray-300 text-sm'>İzlenen Filmler</p>
            <p className='text-white text-2xl font-bold'>
              {stats?.totalWatched || 0}
            </p>
          </div>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 flex items-center gap-4'>
          <div className='bg-purple-600 rounded-full p-3'>
            <FaClock className='text-white text-xl' />
          </div>
          <div>
            <p className='text-gray-300 text-sm'>Toplam İzleme Süresi</p>
            <p className='text-white text-2xl font-bold'>
              {stats?.watchTimeHours || 0} saat
            </p>
          </div>
        </div>
      </div>

      <div className='mb-6'>
        <h3 className='text-lg font-medium text-white mb-3 flex items-center gap-2'>
          <FaChartPie className='text-blue-400' /> En Çok İzlediğim Türler
        </h3>

        {stats?.favoriteGenres && stats.favoriteGenres.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {stats.favoriteGenres.map((genre, index) => (
              <div
                key={index}
                className='bg-gray-700 text-white px-3 py-1 rounded-full flex items-center gap-1'
              >
                <span>{genre.name}</span>
                <span className='bg-blue-600 text-xs px-2 py-0.5 rounded-full'>
                  {genre.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-gray-400'>Henüz yeterli film izlenmemiş.</p>
        )}
      </div>

      <div>
        <h3 className='text-lg font-medium text-white mb-3 flex items-center gap-2'>
          <FaCalendarAlt className='text-blue-400' /> Son İzlenen Filmler
        </h3>

        {stats?.recentlyWatched && stats.recentlyWatched.length > 0 ? (
          <div className='space-y-2'>
            {stats.recentlyWatched.map((movie, index) => (
              <div
                key={index}
                className='bg-gray-700 p-3 rounded flex justify-between items-center'
              >
                <p className='text-white'>{movie.title}</p>
                <p className='text-gray-400 text-sm'>{movie.date}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-gray-400'>Henüz film izlenmemiş.</p>
        )}
      </div>
    </div>
  );
}
