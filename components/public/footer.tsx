'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function Footer() {
  const { lang, toggleLang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <footer>
      <div className="container">
        <p style={{ textAlign: 'center', fontSize: 20, marginBottom: 34 }}>{t.footer.bismillah}</p>
        <div className="foot-grid">
          <div>
            <h4>{t.footer.societyName}</h4>
            <p className="bn" style={{ marginBottom: 10 }}>{t.footer.societyBn}</p>
            <p>{t.footer.description}</p>
            <div style={{ marginTop: 14 }}>
              <button
                onClick={toggleLang}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 transition-colors cursor-pointer"
              >
                <span>🌐 {isBn ? 'Switch to English' : 'বাংলায় রূপান্তর করুন'}</span>
              </button>
            </div>
          </div>
          <div>
            <h4>{t.footer.quickLinks}</h4>
            <ul>
              <li><Link href="/about">{t.footer.aboutUs}</Link></li>
              <li><Link href="/constitution">{t.footer.constitution}</Link></li>
              <li><Link href="/leadership">{t.footer.leadership}</Link></li>
              <li><Link href="/membership">{t.footer.membership}</Link></li>
              <li><Link href="/documents">{t.footer.documents}</Link></li>
              <li><Link href="/login">{t.footer.portalLogin}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t.footer.bankSignatories}</h4>
            <ul>
              <li>{isBn ? 'মোঃ জুয়েল খান' : 'Md. Jewel Khan'}</li>
              <li>{isBn ? 'মোঃ ইউসুফ' : 'Md. Yusuf'}</li>
              <li>{isBn ? 'মোঃ বাবুল মিয়া' : 'Md. Babul Miah'}</li>
            </ul>
          </div>
          <div>
            <h4>{t.footer.contact}</h4>
            <p>{t.contact.addressLine1}</p>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{t.footer.copyright}</span>
          <span className="serif">{t.footer.quote}</span>
        </div>
      </div>
    </footer>
  );
}
