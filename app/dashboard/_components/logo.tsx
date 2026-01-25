import Image from "next/image";

export const Logo = () => {
    return (
        <Image
            height={60}
            width={60}
            alt="logo"
            src="/logo.png"
            className="w-20 h-20 md:w-16 md:h-16 object-contain"
            unoptimized
        />
    )
}