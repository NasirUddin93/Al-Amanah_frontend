'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/constitution', label: 'Constitution' },
  { href: '/leadership', label: 'Leadership' },
  { href: '/membership', label: 'Membership' },
  { href: '/documents', label: 'Documents' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => {
      document.querySelector('.nav')?.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211</span>
          <span>Established: <b>July 01, 2026</b> • Non-political • Mutual-aid • Welfare</span>
        </div>
      </div>

      <nav className={`nav ${open ? 'open' : ''}`}>
        <div className="container flex items-center justify-between py-3.5">
          <Link href="/" className="logo flex items-center gap-3">
            <div className="logo-mark">আ</div>
            <div>
              <b>Al-Amanah Society</b>
              <small className="bn">আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি</small>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="nav-links hidden lg:flex items-center gap-6">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm font-semibold hover:text-emerald-700 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex btn btn-ghost"
              style={{ padding: '9px 18px', fontSize: '13.5px' }}
            >
              Portal Login
            </Link>
            <Link href="/membership" className="btn btn-green" style={{ padding: '9px 20px', fontSize: '13.5px' }}>
              Join Now
            </Link>
            {/* Hamburger Button (Mobile / Tablet only) */}
            <button
              className="lg:hidden p-2 rounded-lg border border-emerald-200 text-slate-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              onClick={() => setOpen(!open)}
              aria-label="Toggle navigation menu"
            >
              {open ? <X className="h-5 w-5 text-emerald-800" /> : <Menu className="h-5 w-5 text-emerald-800" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {open && (
          <div className="lg:hidden border-t border-emerald-100 bg-white/95 backdrop-blur-md px-6 py-4 shadow-lg flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-semibold text-slate-700 hover:text-emerald-700 border-b border-emerald-50/60"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm font-bold text-emerald-700"
            >
              Portal Login
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
