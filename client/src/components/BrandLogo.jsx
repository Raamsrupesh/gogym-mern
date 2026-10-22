export default function BrandLogo({ className = '' }) {
  return (
    <img
      src="https://res.cloudinary.com/dbeasd4ey/image/upload/v1792595176/WhatsApp_Image_2026-10-21_at_18.42.42.jpg"
      alt="GoGym"
      className={`h-10 w-auto max-w-[160px] rounded-[15px] border border-electricblue object-contain px-1 py-1 sm:h-12 sm:max-w-[200px] lg:h-16 lg:w-[260px] lg:max-w-[260px] ${className}`}
    />
  );
}
