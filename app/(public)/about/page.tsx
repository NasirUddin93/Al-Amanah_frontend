'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import SectionHead from '@/components/public/section-head';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function AboutPage() {
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.about.heroTag}</span>
          <h1 className="sec-title">
            {t.about.heroTitle} <span className="g">{t.about.heroTitleAccent}</span>
          </h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>
            {t.about.heroSub}
          </p>
        </div>
      </div>

      <section>
        <div className="container grid-2">
          <Reveal>
            <ImgHolder label={isBn ? 'সোসাইটির সভার ছবি' : 'Society Gathering Photo'} size="800 × 900 px" height={460} />
          </Reveal>
          <div>
            <SectionHead
              tag={t.about.preambleTag}
              title={<>{t.about.preambleTitle} <span className="g">{t.about.preambleTitleAccent}</span></>}
            />
            <Reveal delay={200}>
              <p className="sec-sub">
                {t.about.preambleDesc}
              </p>
            </Reveal>
            <div className="pill-row">
              {(isBn
                ? ['সম্পূর্ণ অরাজনৈতিক', 'পারস্পরিক সহযোগিতা', 'জনকল্যাণ', 'ক্ষুদ্র বিনিয়োগ', 'সমবায়']
                : ['Non-political', 'Mutual-aid', 'Welfare', 'Micro-investment', 'Cooperative']
              ).map((p) => (<span key={p} className="pill">{p}</span>))}
            </div>
          </div>
        </div>
      </section>

      <section className="principles">
        <div className="container">
          <SectionHead
            center
            tag={t.about.aimsTag}
            title={<>{t.about.aimsTitle} <span className="g">{t.about.aimsTitleAccent}</span></>}
          />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['🤝', t.home.val1Title, t.home.val1Desc],
              ['🏛️', t.home.val2Title, t.home.val2Desc],
              ['🌱', t.home.val3Title, t.home.val3Desc],
            ].map(([e, tit, d], i) => (
              <Reveal key={tit} delay={i * 100}>
                <div className="pr-card"><span className="ico">{e}</span><h3>{tit}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container grid-2">
          <div>
            <SectionHead
              tag={t.about.significanceTag}
              title={<>{t.about.significanceTitle} <span className="g">{t.about.significanceTitleAccent}</span></>}
            />
            <Reveal delay={200}>
              <p className="sec-sub">
                {t.about.significanceDesc}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="motto" style={{ marginTop: 24 }}>
                <p className="serif">{t.home.quranQuote}</p>
                <span>{t.home.quranSurah}</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <ImgHolder label={isBn ? 'সমাজকল্যাণমূলক কার্যক্রম' : 'Community Welfare Photo'} size="800 × 600 px" height={380} />
          </Reveal>
        </div>
      </section>
    </>
  );
}

