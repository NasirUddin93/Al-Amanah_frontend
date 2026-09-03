import React from 'react';
import Navbar from '@/components/public/navbar';
import Footer from '@/components/public/footer';
import { LanguageProvider } from '@/components/language-context';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
