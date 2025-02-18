import Link from 'next/link';
export default function Home() {
  return (
    <div className='w-screen py-20 flex justify-center items-center flex-col'>
      <div className="flex items-center justify-between gap-1 mb-5">
        <h1 className="text-4xl font-bold">Home</h1>
      </div>
      <Link className="text-purple-500 ml-2 relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-purple-500 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100" href="/users/register">Register</Link>
      HomePage
    </div>
  );
}
