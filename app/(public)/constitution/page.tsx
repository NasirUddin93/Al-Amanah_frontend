'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS, CLAUSES_I18N } from '@/lib/translations';

export default function ConstitutionPage() {
  const { lang } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.constitution.heroTag}</span>
          <h1 className="sec-title">
            {t.constitution.heroTitle} <span className="g">{t.constitution.heroTitleAccent}</span>
          </h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>
            {t.constitution.heroSub}
          </p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="grid-3">
            {CLAUSES_I18N.map((c, i) => (
              <Reveal key={c.n} delay={(i % 3) * 100}>
                <div className="pr-card">
                  <div className="pr-num">{String(c.n).padStart(2, '0')}</div>
                  <h3>{c.t[lang]}</h3>
                  <p>{c.x[lang]}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="cta-box" style={{ marginTop: 70 }}>
              <h2>{t.constitution.clause3Title}</h2>
              <p>{t.constitution.clause3Desc}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
