"use client";
import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const Register = () => {
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();

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
      const response = await axios.post(
        "http://localhost:3001/register",
        {
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        },
        { withCredentials: true }
      );

      if (response.status === 200) {
        router.push("/users/login");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.errors
          ? error.response.data.errors.join(", ")
          : error.response?.data || "Kayıt sırasında bir hata oluştu.";
        alert(errorMessage);
      } else {
        console.error("Kayıt hatası:", error);
        alert("Kayıt sırasında bir hata oluştu.");
      }
    }
  };

  return (
    <div className='flex justify-center relative min-h-screen bg-black'>
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
