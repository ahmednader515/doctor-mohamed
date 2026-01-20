import Image from "next/image";

export const Logo = () => {
    return (
        <Image
            height={80}
            width={80}
            alt="logo"
            src="/logo.png"
            className="w-32 h-32 md:w-20 md:h-20"
            unoptimized
        />
    )
}