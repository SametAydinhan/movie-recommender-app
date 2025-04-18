"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/utils/auth";
import { useDispatch, useSelector } from "react-redux";
import { setAuth } from "@/store/features/authSlice";
import { RootState } from "@/store/store";

const Register = () => {
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Eğer kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
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
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    // Kullanıcı adı validasyonu
    if (!registerUsername) {
      newErrors.username = "Kullanıcı adı boş bırakılamaz";
      isValid = false;
    } else if (registerUsername.length < 3) {
      newErrors.username = "Kullanıcı adı en az 3 karakter olmalıdır";
      isValid = false;
    }

    // Email validasyonu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!registerEmail) {
      newErrors.email = "Email alanı boş bırakılamaz";
      isValid = false;
    } else if (!emailRegex.test(registerEmail)) {
      newErrors.email = "Geçerli bir email adresi giriniz";
      isValid = false;
    }

    // Şifre validasyonu
    if (!registerPassword) {
      newErrors.password = "Şifre alanı boş bırakılamaz";
      isValid = false;
    } else if (registerPassword.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır";
      isValid = false;
    }

    // Şifre tekrar validasyonu
    if (!registerConfirmPassword) {
      newErrors.confirmPassword = "Şifre tekrar alanı boş bırakılamaz";
      isValid = false;
    } else if (registerPassword !== registerConfirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      console.log("Kayıt isteği gönderiliyor...", {
        url: "http://localhost:3001/auth/register",
        data: {
          username: registerUsername,
          email: registerEmail,
          password: "[GIZLI]",
        },
      });

      const registerResponse = await axios.post(
        "http://localhost:3001/auth/register",
        {
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Kayıt yanıtı:", registerResponse.data);

      if (registerResponse.status === 200) {
        // Kayıt başarılı olduktan sonra otomatik giriş yap
        console.log("Kayıt başarılı, otomatik giriş yapılıyor...");

        const loginResponse = await axios.post(
          "http://localhost:3001/auth/login",
          {
            usernameOrEmail: registerEmail,
            password: registerPassword,
          },
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Otomatik giriş yanıtı:", loginResponse.data);

        if (loginResponse.status === 200) {
          setAuthToken(loginResponse.data.token);
          dispatch(setAuth(true));
          router.push("/movies");
        }
      }
    } catch (error) {
      console.error("Kayıt hatası detaylı:", error);

      if (axios.isAxiosError(error)) {
        console.error("Sunucu yanıt detayları:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
          },
        });

        const errorMessage = error.response?.data?.errors
          ? Array.isArray(error.response.data.errors)
            ? error.response.data.errors.join(", ")
            : error.response.data.errors
          : error.response?.data?.message || "Kayıt sırasında bir hata oluştu.";

        alert(
          `Kayıt hatası: ${errorMessage} (${
            error.response?.status || "Bilinmeyen hata"
          })`
        );
      } else {
        console.error("Bilinmeyen kayıt hatası:", error);
        alert(
          "Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin."
        );
      }
    }
  };

  return (
    <div className='flex justify-center relative h-[calc(100vh-64px)] bg-black'>
      <div className='w-full mx-auto max-w-xl px-6 lg:px-8 absolute py-20'>
        <div className='rounded-2xl shadow-xl bg-gray-800 p-8'>
          <h1 className='text-white text-center font-manrope text-3xl font-bold mb-6'>
            Hesap Oluştur
          </h1>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-gray-200 mb-1'>E-mail</label>
              <input
                type='email'
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder='E-mail'
                className={`input-base ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className='text-red-500 text-sm mt-1'>{errors.email}</p>
              )}
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Kullanıcı Adı</label>
              <input
                type='text'
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder='Kullanıcı Adı'
                className={`input-base ${
                  errors.username ? "border-red-500" : ""
                }`}
              />
              {errors.username && (
                <p className='text-red-500 text-sm mt-1'>{errors.username}</p>
              )}
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Şifre</label>
              <input
                type='password'
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder='Şifre'
                className={`input-base ${
                  errors.password ? "border-red-500" : ""
                }`}
              />
              {errors.password && (
                <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
              )}
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Şifre Tekrar</label>
              <input
                type='password'
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder='Şifre Tekrar'
                className={`input-base ${
                  errors.confirmPassword ? "border-red-500" : ""
                }`}
              />
              {errors.confirmPassword && (
                <p className='text-red-500 text-sm mt-1'>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button type='submit' className='button-base w-full'>
              Kayıt Ol
            </button>
          </form>

          <p className='text-center text-gray-200 text-base mt-6'>
            Hesabın var mı?{" "}
            <Link
              href='/users/login'
              className="text-purple-500 ml-2 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
