import Image from 'next/image';

export default function FeedsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/clouds.png"
          alt="Clouds Background"
          fill
          className="object-cover"
          priority
        />
      </div>
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
} 