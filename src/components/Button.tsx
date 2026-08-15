import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "md" | "lg";
}

export default function Button({ size = "lg", className = "", style, ...props }: ButtonProps) {
  const sizeClasses = size === "lg" ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm";

  return (
    <button
      {...props}
      className={`relative rounded-xl font-semibold text-white transition active:translate-y-[2px] active:shadow-none hover:brightness-[1.05] ${sizeClasses} ${className}`}
      style={{
        background: "linear-gradient(180deg, #f4823f 0%, #f2601f 100%)",
        boxShadow: "0 4px 0 0 #c94c15, 0 8px 16px -4px rgba(242,96,31,0.4)",
        ...style,
      }}
    />
  );
}
