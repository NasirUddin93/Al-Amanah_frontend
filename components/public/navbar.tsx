'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard, ShieldCheck, User as UserIcon, LogOut, Globe } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { useLogoutMutation } from '@/lib/api';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { lang, toggleLang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();

  const LINKS = [
    { href: '/', label: t.nav.home },
    { href: '/about', label: t.nav.about },
    { href: '/constitution', label: t.nav.constitution },
    { href: '/leadership', label: t.nav.leadership },
    { href: '/membership', label: t.nav.membership },
    { href: '/documents', label: t.nav.documents },
    { href: '/contact', label: t.nav.contact },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const unwrappedUser = (user as any)?.data || user;
  const roleName =
    typeof unwrappedUser?.role === 'string'
      ? unwrappedUser.role
      : unwrappedUser?.role?.name || (unwrappedUser?.role as any)?.data?.name;

  const dashboardHref =
    roleName === 'super_admin' || roleName === 'admin'
      ? '/admin'
      : roleName === 'accountant'
      ? '/accounts'
      : '/member';

  const isLoggedIn = mounted && Boolean(token && unwrappedUser);

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
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-center sm:text-left text-[11px] sm:text-[13px] py-1.5 sm:py-2">
          <span className="truncate max-w-full">{t.nav.address}</span>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-emerald-200">{t.nav.tagline}</span>
            {/* Topbar Language Switcher */}
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-500/50 text-white text-[11px] font-bold transition-all cursor-pointer"
              title={isBn ? 'Switch to English' : 'বাংলায় দেখুন'}
            >
              <Globe className="h-3 w-3 text-emerald-300" />
              <span className={!isBn ? 'text-emerald-300 font-extrabold' : 'text-slate-300 font-normal'}>EN</span>
              <span className="text-emerald-400/60">/</span>
              <span className={isBn ? 'text-emerald-300 font-extrabold' : 'text-slate-300 font-normal'}>বাংলা</span>
            </button>
          </div>
        </div>
      </div>

      <nav className={`nav ${open ? 'open' : ''}`}>
        <div className="container flex items-center justify-between py-3 sm:py-3.5">
          <Link href="/" className="logo flex items-center gap-2.5 sm:gap-3">
            <div className="logo-mark w-9 h-9 sm:w-11 sm:h-11 text-lg sm:text-xl">আ</div>
            <div>
              <b className="text-base sm:text-[17px] leading-tight block">{t.nav.societyName}</b>
              <small className="bn text-[11px] sm:text-xs text-emerald-700 font-semibold block">আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি</small>
            </div>
          </Link>

          {/* Desktop Navigation Links (Hidden on Mobile) */}
          <ul className="nav-links hidden lg:flex items-center gap-6">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm font-semibold hover:text-emerald-700 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Main Navbar Language Pill Toggle */}
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-emerald-300/80 bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title={isBn ? 'Switch to English' : 'বাংলায় দেখুন'}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span className={!isBn ? 'text-emerald-900 font-extrabold' : 'text-slate-500 font-medium'}>EN</span>
              <span className="text-emerald-300 font-light">|</span>
              <span className={isBn ? 'text-emerald-900 font-extrabold' : 'text-slate-500 font-medium'}>বাংলা</span>
            </button>

            {isLoggedIn ? (
              <div className="relative">
                <Link
                  href={dashboardHref}
                  className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 transition-all shadow-2xs group"
                  title={`Signed in as ${unwrappedUser.name} - Click to open Dashboard`}
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-700 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs">
                    {unwrappedUser.name ? unwrappedUser.name.slice(0, 2).toUpperCase() : 'AD'}
                  </div>
                  <div className="text-left hidden sm:block pr-1">
                    <div className="text-xs font-bold text-slate-900 leading-none truncate max-w-[120px]">
                      {unwrappedUser.name?.split(' ')[0] || 'User'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase leading-none mt-0.5">
                      {t.nav.dashboard} ↗
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex btn btn-ghost"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {t.nav.portalLogin}
                </Link>
                <Link href="/membership" className="btn btn-green text-xs sm:text-[13.5px]" style={{ padding: '8px 16px' }}>
                  {isBn ? 'যুক্ত হোন' : 'Join Now'}
                </Link>
              </>
            )}

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

        {/* Mobile Slide Drawer */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            <div className="w-[82vw] max-w-[320px] h-[100dvh] bg-white text-slate-900 flex flex-col shadow-2xl border-l border-emerald-100 animate-in slide-in-from-right duration-250">
              {/* Drawer Header */}
              <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold text-sm flex items-center justify-center">আ</div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{t.nav.societyName}</div>
                    <div className="text-[10px] text-emerald-700 font-medium">{isBn ? 'ন্যাভিগেশন মেনু' : 'Navigation Menu'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleLang}
                    className="px-2 py-1 rounded-md bg-white border border-emerald-300 text-[11px] font-bold text-emerald-900 shadow-2xs"
                  >
                    {isBn ? 'EN' : 'বাংলা'}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* User Status in Drawer */}
              {isLoggedIn ? (
                <div className="p-3.5 bg-emerald-900 text-white border-b border-emerald-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-200">
                      {unwrappedUser.name ? unwrappedUser.name.slice(0, 2).toUpperCase() : 'ME'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{unwrappedUser.name}</div>
                      <div className="text-[10px] text-emerald-300 font-mono uppercase">{roleName?.replace(/_/g, ' ') || 'Member'}</div>
                    </div>
                  </div>
                  <Link
                    href={dashboardHref}
                    onClick={() => setOpen(false)}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white transition-colors"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" /> {t.nav.dashboard}
                  </Link>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/60 border-b border-emerald-100 flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center py-2 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs hover:bg-emerald-50"
                  >
                    {t.nav.portalLogin}
                  </Link>
                  <Link
                    href="/membership"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold shadow-2xs hover:bg-emerald-800"
                  >
                    {isBn ? 'যুক্ত হোন' : 'Apply Now'}
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/70 transition-colors"
                  >
                    <span>{l.label}</span>
                    <span className="text-xs text-slate-400">›</span>
                  </Link>
                ))}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Kamrangirchar, Dhaka</span>
                  <span className="text-emerald-700 font-bold">Est. 2026</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
