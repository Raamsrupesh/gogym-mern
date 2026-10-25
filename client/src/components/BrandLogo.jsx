export default function BrandLogo({ className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-2xl border border-[#F05423] shadow-[0_0_18px_rgba(240,84,35,0.2)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(240,84,35,0.35)] ${className}`}
    >
      <span className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-[15px] bg-white p-1 sm:h-[72px] sm:w-32">
        <img
          src="https://res.cloudinary.com/dbeasd4ey/image/upload/v1792595176/WhatsApp_Image_2026-10-21_at_18.42.42.jpg"
          alt="GoGym"
          className="block h-full w-full object-contain"
        />
      </span>
    </span>
  );
}