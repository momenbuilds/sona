import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "md" | "lg";
}

export default function Button({ size = "lg", className = "", style, ...props }: ButtonProps) {
  const sizeClasses = size === "lg" ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm";

  return (
    <button
      {...props}
      className={`relative rounded-full font-semibold text-white transition active:scale-[0.96] active:brightness-95 hover:brightness-[1.08] ${sizeClasses} ${className}`}
      style={{
        background: "linear-gradient(180deg, #8b7cf0 0%, #6d5ce6 55%, #5a48d6 100%)",
        boxShadow:
          "inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(38,25,120,0.35), 0 10px 24px -6px rgba(93,72,214,0.55), 0 2px 4px rgba(93,72,214,0.3)",
        ...style,
      }}
    />
  );
}
