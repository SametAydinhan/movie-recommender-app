"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { logout, checkUserAuth } from "@/store/features/authSlice";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaTrash,
  FaSignOutAlt,
  FaSave,
  FaClock,
  FaFilm,
  FaHourglassHalf,
} from "react-icons/fa";
import { getAuthToken } from "@/utils/auth";

interface UserData {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [watchStats, setWatchStats] = useState({
    totalWatched: 0,
    totalHours: 0,
    watchTimeFormatted: "0 dakika",
  });
  const dispatch = useDispatch<AppDispatch>();

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Saat güncellemesi için interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError("");

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Giriş yapılmamış");
        }

        const response = await fetch("http://localhost:3001/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API Hatası: ${response.status}`);
        }

        const data = await response.json();
        setUser(data.user);
        setUsername(data.user.username);
        setEmail(data.user.email);
      } catch (error: any) {
        console.error("Kullanıcı bilgileri alınırken hata:", error);

        if (error.message === "Giriş yapılmamış") {
          // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
          router.push("/users/login");
        } else {
          setError(
            "Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // İzleme istatistiklerini getir
  useEffect(() => {
    const fetchWatchStats = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

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

        if (response.ok) {
          const data = await response.json();
          console.log("İstatistik verisi:", data); // Debug için

          if (data.stats) {
            setWatchStats({
              totalWatched: data.stats.totalWatched || 0,
              totalHours: data.stats.watchTimeHours || 0,
              watchTimeFormatted: data.stats.watchTimeFormatted || "0 dakika",
            });
          }
        }
      } catch (error) {
        console.error("İzleme istatistikleri alınırken hata:", error);
      }
    };

    fetchWatchStats();
  }, []);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation
    if (password && password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Giriş yapılmamış");
      }

      // Sadece değiştirilen alanları gönder
      const updatedData: {
        username?: string;
        email?: string;
        password?: string;
      } = {};
      if (username !== user?.username) updatedData.username = username;
      if (email !== user?.email) updatedData.email = email;
      if (password) updatedData.password = password;

      // Hiçbir alan değiştirilmediyse
      if (Object.keys(updatedData).length === 0) {
        setIsEditing(false);
        return;
      }

      const response = await fetch("http://localhost:3001/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Profil güncellenirken bir hata oluştu"
        );
      }

      const data = await response.json();
      setUser(data.user);
      setSuccessMessage("Profil bilgileriniz başarıyla güncellendi.");
      setIsEditing(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Profil güncellenirken hata:", error);
      setError(error.message || "Profil güncellenirken bir hata oluştu.");
    }
  };
   const handleLogout = () => {
      // İlk olarak removeAuthToken fonksiyonunu import et
      import("@/utils/auth").then(({ removeAuthToken }) => {
        // LocalStorage'dan token'ı temizle
        removeAuthToken();
        // Redux state'i güncelle
        dispatch(logout());
        // Kullanıcıyı ana sayfaya yönlendir
        router.push("/");
      });
    };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "HESABIMI SİL") {
      setError("Hesabınızı silmek için 'HESABIMI SİL' yazmanız gerekiyor.");
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Giriş yapılmamış");
      }

      const response = await fetch("http://localhost:3001/api/users/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Hesap silinirken bir hata oluştu"
        );
      }

      // Oturumu sonlandır ve ana sayfaya yönlendir
      localStorage.removeItem("token");
      router.push("/");
    } catch (error: any) {
      console.error("Hesap silinirken hata:", error);
      setError(error.message || "Hesap silinirken bir hata oluştu.");
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 text-white py-12'>
      <div className='max-w-3xl mx-auto px-4'>
        <h1 className='text-3xl font-bold mb-8 text-center'>Hesap Yönetimi</h1>

        {/* Saat ve Tarih Bileşeni */}
        <div className='bg-gray-800 rounded-lg p-4 mb-6 shadow-lg'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <FaClock className='text-blue-400 text-xl' />
              <h2 className='text-xl font-semibold'>Güncel Saat</h2>
            </div>
            <div className='text-2xl font-bold text-blue-400'>
              {currentTime.toLocaleTimeString("tr-TR")}
            </div>
          </div>
          <div className='mt-2 text-right text-gray-400'>
            {currentTime.toLocaleDateString("tr-TR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {error && (
          <div className='bg-red-500 text-white p-4 rounded mb-6'>
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className='bg-green-500 text-white p-4 rounded mb-6'>
            <p>{successMessage}</p>
          </div>
        )}

        <div className='bg-gray-800 rounded-lg p-6 shadow-lg mb-8'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-semibold'>Profil Bilgileri</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className='py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center gap-2'
            >
              {isEditing ? "İptal" : "Düzenle"}
            </button>
          </div>

          {!isEditing ? (
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <FaUser className='text-gray-400' />
                <div>
                  <p className='text-gray-400 text-sm'>Kullanıcı Adı</p>
                  <p className='font-medium'>{user?.username}</p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <FaEnvelope className='text-gray-400' />
                <div>
                  <p className='text-gray-400 text-sm'>E-posta</p>
                  <p className='font-medium'>{user?.email}</p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <FaUser className='text-gray-400' />
                <div>
                  <p className='text-gray-400 text-sm'>Kayıt Tarihi</p>
                  <p className='font-medium'>
                    {user?.createdAt
                      ? new Intl.DateTimeFormat("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(user.createdAt))
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveChanges} className='space-y-4'>
              <div>
                <label className='block text-gray-300 mb-1'>
                  Kullanıcı Adı
                </label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3'>
                    <FaUser className='text-gray-400' />
                  </span>
                  <input
                    type='text'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className='w-full bg-gray-700 rounded py-2 px-10 text-white'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-gray-300 mb-1'>E-posta</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3'>
                    <FaEnvelope className='text-gray-400' />
                  </span>
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full bg-gray-700 rounded py-2 px-10 text-white'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-gray-300 mb-1'>
                  Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)
                </label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3'>
                    <FaLock className='text-gray-400' />
                  </span>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='w-full bg-gray-700 rounded py-2 px-10 text-white'
                  />
                </div>
              </div>

              <div>
                <label className='block text-gray-300 mb-1'>Şifre Onayı</label>
                <div className='relative'>
                  <span className='absolute inset-y-0 left-0 flex items-center pl-3'>
                    <FaLock className='text-gray-400' />
                  </span>
                  <input
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='w-full bg-gray-700 rounded py-2 px-10 text-white'
                  />
                </div>
              </div>

              <button
                type='submit'
                className='w-full py-2 mt-4 bg-green-600 hover:bg-green-700 rounded text-white flex items-center justify-center gap-2'
              >
                <FaSave /> Değişiklikleri Kaydet
              </button>
            </form>
          )}
        </div>

        {/* Film İstatistikleri Özeti */}
        <div className='bg-gray-800 rounded-lg p-4 mb-8 shadow-lg'>
          <h3 className='text-lg font-medium text-white mb-3 text-center'>
            Film İzleme İstatistiklerim
          </h3>
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-gray-700 rounded-lg p-4 flex items-center gap-3'>
              <div className='bg-purple-600 rounded-full p-2'>
                <FaFilm className='text-white' />
              </div>
              <div>
                <p className='text-gray-400 text-sm'>İzlenen Filmler</p>
                <p className='text-xl font-semibold'>
                  {watchStats.totalWatched}
                </p>
              </div>
            </div>

            <div className='bg-gray-700 rounded-lg p-4 flex items-center gap-3'>
              <div className='bg-blue-600 rounded-full p-2'>
                <FaHourglassHalf className='text-white' />
              </div>
              <div>
                <p className='text-gray-400 text-sm'>Toplam İzleme</p>
                <p className='text-xl font-semibold'>
                  {watchStats.watchTimeFormatted}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-6 shadow-lg mb-8'>
          <h2 className='text-2xl font-semibold mb-4'>Hesap İşlemleri</h2>

          <div className='space-y-4'>
            <Link
              href='/users/login'
              className='w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center justify-center gap-2'
              onClick={handleLogout}
            >
              <FaSignOutAlt /> Oturumu Kapat
            </Link>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className='w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white flex items-center justify-center gap-2'
              >
                <FaTrash /> Hesabımı Sil
              </button>
            ) : (
              <div className='border border-red-500 rounded-lg p-4 mt-4'>
                <p className='text-red-400 mb-3'>
                  Bu işlem geri alınamaz. Hesabınızı silmek istediğinizden emin
                  misiniz?
                </p>
                <p className='text-red-400 mb-3'>
                  Onaylamak için aşağıya <strong>HESABIMI SİL</strong> yazın:
                </p>
                <input
                  type='text'
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className='w-full bg-gray-700 rounded py-2 px-3 text-white mb-3'
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className='py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded text-white'
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className='py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-white'
                  >
                    Hesabımı Sil
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='text-center'>
          <Link href='/' className='text-blue-400 hover:underline'>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
