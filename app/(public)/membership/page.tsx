'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function MembershipPage() {
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  const steps = [
    { n: '01', t: t.membership.step1Title, d: t.membership.step1Desc },
    { n: '02', t: t.membership.step2Title, d: t.membership.step2Desc },
    { n: '03', t: t.membership.step3Title, d: t.membership.step3Desc },
    { n: '04', t: t.membership.step4Title, d: t.membership.step4Desc },
  ];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.membership.heroTag}</span>
          <h1 className="sec-title">
            {t.membership.heroTitle} <span className="g">{t.membership.heroTitleAccent}</span>
          </h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>
            {t.membership.heroSub}
          </p>
        </div>
      </div>

      <section className="membership">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'start', gap: 50 }}>
            <Reveal>
              <div className="check-card">
                <h3 style={{ fontSize: 20, marginBottom: 20 }}>{t.membership.eligibilityTitle}</h3>
                <ul className="check-list">
                  {t.membership.eligibilityList.map((item) => (
                    <li key={item}>
                      <span className="tick">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="fee-strip">{t.membership.feeStrip}</div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div>
                {steps.map(({ n, t: title, d: desc }) => (
                  <div className="step" key={n}>
                    <div className="step-num">{isBn ? (n === '01' ? '০১' : n === '02' ? '০২' : n === '03' ? '০৩' : '০৪') : n}</div>
                    <div>
                      <b>{title}</b>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="cta-box" style={{ marginTop: 70 }}>
              <h2>{t.membership.resignationTitle}</h2>
              <p>{t.membership.resignationDesc}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

