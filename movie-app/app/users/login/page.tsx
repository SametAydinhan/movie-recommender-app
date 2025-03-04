"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/utils/auth";
import { useDispatch, useSelector } from "react-redux";
import { setAuth } from "@/store/features/authSlice";
import { RootState } from "@/store/store";

const Login = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/movies");
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, router]);

  // Eğer yükleme aşamasındaysa veya kullanıcı giriş yapmışsa, hiçbir şey render etme
  if (isLoading || isAuthenticated) {
    return null;
  }

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: "",
      password: "",
    };

    // Kullanıcı adı veya Email validasyonu
    if (!loginEmail) {
      newErrors.email = "Kullanıcı adı veya email alanı boş bırakılamaz";
      isValid = false;
    } else if (loginEmail.includes("@")) {
      // Eğer @ işareti varsa email formatını kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginEmail)) {
        newErrors.email = "Geçerli bir email adresi giriniz";
        isValid = false;
      }
    } else if (loginEmail.length < 3) {
      // Kullanıcı adı için minimum uzunluk kontrolü
      newErrors.email = "Kullanıcı adı en az 3 karakter olmalıdır";
      isValid = false;
    }

    // Şifre validasyonu
    if (!loginPassword) {
      newErrors.password = "Şifre alanı boş bırakılamaz";
      isValid = false;
    } else if (loginPassword.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Form submit'in default davranışını engelle

    if (!validateForm()) {
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3001/login",
        {
          usernameOrEmail: loginEmail,
          password: loginPassword,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        setAuthToken(response.data.token);
        dispatch(setAuth(true));
        router.push("/");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data || "Giriş yapılırken bir hata oluştu.");
      } else {
        console.error("Giriş hatası:", error);
        alert("Giriş yapılırken bir hata oluştu.");
      }
    }
  };

  return (
    <div className='h-[calc(100vh-64px)] bg-black flex items-center justify-center py-10'>
      <div className='w-full mx-auto max-w-xl px-6 lg:px-8'>
        <div className='rounded-2xl shadow-xl bg-gray-800'>
          <div className='lg:p-14 p-7 mx-auto'>
            <div className='mb-11'>
              <h1 className='text-white text-center font-manrope text-3xl font-bold leading-10 mb-2'>
                Giriş Yap
              </h1>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Email */}
              <div>
                <label htmlFor='email' className='block text-gray-200 mb-1'>
                  Kullanıcı Adı veya E-mail
                </label>
                <input
                  type='text'
                  id='email'
                  name='email'
                  placeholder='Kullanıcı Adı veya E-mail'
                  className={`input-base ${
                    errors.email ? "border-red-500" : ""
                  }`}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                {errors.email && (
                  <p className='text-red-500 text-sm mt-1'>{errors.email}</p>
                )}
              </div>

              {/* Şifre */}
              <div>
                <label htmlFor='password' className='block text-gray-200 mb-1'>
                  Şifre
                </label>
                <input
                  type='password'
                  id='password'
                  name='password'
                  placeholder='Şifre'
                  className={`input-base ${
                    errors.password ? "border-red-500" : ""
                  }`}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                {errors.password && (
                  <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
                )}
              </div>

              <span className='flex justify-end text-base font-medium leading-6'>
                <Link
                  href='#'
                  className="text-purple-500 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100"
                >
                  Şifremi Unuttum
                </Link>
              </span>

              {/* Giriş Yap Butonu */}
              <button type='submit' className='button-base w-full'>
                Giriş Yap
              </button>

              {/* Kayıt Ol Linki */}
              <div className='flex justify-center text-gray-200 text-base font-medium leading-6 mt-6'>
                Hesabın yok mu?
                <Link
                  href='/users/register'
                  className="text-purple-500 ml-2 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100"
                >
                  Kayıt Ol
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
