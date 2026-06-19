import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-150 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
