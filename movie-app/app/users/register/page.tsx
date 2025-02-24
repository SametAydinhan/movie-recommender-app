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
  const [message, setMessage] = useState("");
  const router = useRouter();

  interface RegisterResponse {
    data: string;
  }  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault(); // Formun sayfayı yenilemesini engelle
    setMessage("");

    if (registerPassword !== registerConfirmPassword) {
      setMessage("Şifreler uyuşmuyor!");
      return;
    }

    try {
      const response: RegisterResponse = await axios.post(
        "http://localhost:3001/register",
        {
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        },
        { withCredentials: true }
      );

      if (response.data === "User already exists") {
        setMessage("Bu kullanıcı adı zaten alınmış.");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
      setMessage(
        err.response?.data || "Bir hata oluştu, lütfen tekrar deneyin."
      );
    }
  };

  return (
    <div className='flex justify-center relative min-h-screen bg-black'>
      <div className='w-full mx-auto max-w-xl px-6 lg:px-8 absolute py-20'>
        <div className='rounded-2xl shadow-xl bg-gray-800 p-8'>
          <h1 className='text-white text-center font-manrope text-3xl font-bold mb-6'>
            Hesap Oluştur
          </h1>

          {message && (
            <p className='text-red-500 text-center mb-4'>{message}</p>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-gray-200 mb-1'>E-mail</label>
              <input
                type='email'
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder='E-mail'
                className='input-base'
                required
              />
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Kullanıcı Adı</label>
              <input
                type='text'
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                placeholder='Kullanıcı Adı'
                className='input-base'
                required
              />
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Şifre</label>
              <input
                type='password'
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder='Şifre'
                className='input-base'
                required
              />
            </div>

            <div>
              <label className='block text-gray-200 mb-1'>Şifre Tekrar</label>
              <input
                type='password'
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder='Şifre Tekrar'
                className='input-base'
                required
              />
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
