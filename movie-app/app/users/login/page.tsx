"use client";
import Link from "next/link";
import { useState } from "react";

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const login = async () => {
    

  }
  return (
    <div className='flex justify-center relative min-h-screen bg-black'>
      <div className='w-full mx-auto max-w-xl px-6 lg:px-8 absolute py-20'>
        {/* Form kapsayıcı: Arka plan siyahın biraz açık tonu */}
        <div className='rounded-2xl shadow-xl bg-gray-800'>
          <div className='lg:p-14 p-7 mx-auto'>
            <div className='mb-11'>
              <h1 className='text-white text-center font-manrope text-3xl font-bold leading-10 mb-2'>
                Hesap Oluştur
              </h1>
            </div>

            {/* Email */}
            <label htmlFor='email' className='block text-gray-200 mb-1'>
              Email
            </label>
            <input
              type='email'
              name='email'
              placeholder='E-mail'
              className='input-base'
              onChange={(e) => setLoginEmail(e.target.value)}
            />

            {/* Şifre */}
            <label htmlFor='password' className='block text-gray-200 mb-1'>
              Şifre
            </label>
            <input
              type='password'
              name='password'
              placeholder='Şifre'
              className='input-base'
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <span className='flex justify-end text-base font-medium leading-6'>
              <Link
                href='#'
                className="text-purple-500 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Şifremi Unuttum
              </Link>
            </span>
            {/* Kayıt Ol Butonu */}
            <button className='button-base' onClick={login}>Giriş Yap</button>

            {/* Giriş Yap Linki */}
            <span className='flex justify-center text-gray-200 text-base font-medium leading-6 mt-6'>
              Hesabın yok mu?
              <Link
                href='/users/register'
                className="text-purple-500 ml-2 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                Kayıt Ol
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
