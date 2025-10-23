import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

export function PageLayout({
  children,
  title,
  maxWidth = '7xl',
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {title && (
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
      )}
      {children}
    </div>
  );
}
