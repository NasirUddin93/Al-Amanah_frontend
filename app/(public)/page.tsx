'use client';
import React from 'react';
import Link from 'next/link';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import Counter from '@/components/public/counter';
import Marquee from '@/components/public/marquee';
import SectionHead from '@/components/public/section-head';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS, CLAUSES_I18N } from '@/lib/translations';

const MARQUEE_BN = [
  'ঐক্যই শক্তি', 'দশে মিলে করি কাজ', 'শরীয়াহ সম্মত বিনিয়োগ',
  'পারস্পরিক সহায়তা ও কল্যাণ', 'অভ্যন্তরীণ ঋণ নিষিদ্ধ', 'স্বচ্ছ ব্যাংকিং', 'ব্যক্তির চেয়ে সমষ্টির কল্যাণ',
];
const MARQUEE_EN = [
  'Unity is Strength', 'Many a Little Makes a Mickle', 'Shariah-Compliant Investment',
  'Mutual Aid & Welfare', 'No Internal Lending', 'Transparent Banking', 'Collective Over Individual',
];

export default function HomePage() {
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  const marqueeList = isBn ? MARQUEE_BN : MARQUEE_EN;

  return (
    <>
      {/* HERO */}
      <header className="hero px-4 sm:px-0 py-10 sm:py-16 lg:py-24">
        <div className="blob" style={{ width: 420, height: 420, background: 'var(--green-200)', top: -120, right: -80 }} />
        <div className="blob" style={{ width: 320, height: 320, background: '#bbf7d0', bottom: -100, left: -90, animationDelay: '3s' }} />
        <div className="container hero-grid">
          <div>
            <span className="hero-badge text-xs sm:text-sm">{t.home.heroBadge}</span>
            <Reveal delay={100}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight">
                {t.home.heroTitle1}<br />
                <span className="grad">{t.home.heroTitle2}</span><br />
                {t.home.heroTitle3}
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="bn text-base sm:text-lg" style={{ color: 'var(--green-700)', fontWeight: 600, marginBottom: 14 }}>
                {t.home.heroSubBn}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="lead text-sm sm:text-base leading-relaxed">
                {t.home.heroLead}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="motto p-3.5 sm:p-4 text-xs sm:text-sm">
                <p className="serif">{t.home.quranQuote}</p>
                <span>{t.home.quranSurah}</span>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="hero-cta flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/membership" className="btn btn-green w-full sm:w-auto text-center justify-center">
                  {t.home.btnJoin}
                </Link>
                <Link href="/constitution" className="btn btn-ghost w-full sm:w-auto text-center justify-center">
                  {t.home.btnConstitution}
                </Link>
              </div>
            </Reveal>
            <Reveal delay={400}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-xl mt-6">
                <div className="stat p-3 sm:p-4 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <b><Counter to={2026} /></b>
                  <span>{t.home.statEst}</span>
                </div>
                <div className="stat p-3 sm:p-4 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <b><Counter to={5} /></b>
                  <span>{t.home.statTenure}</span>
                </div>
                <div className="stat p-3 sm:p-4 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <b><Counter to={30} /></b>
                  <span>{t.home.statMeetings}</span>
                </div>
                <div className="stat p-3 sm:p-4 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                  <b><Counter to={100} suffix="%" /></b>
                  <span>{t.home.statInvest}</span>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="hero-visual mt-6 lg:mt-0">
            <ImgHolder label={isBn ? 'সোসাইটি গ্রুপ ফটো' : 'Society Group Photo'} size="900 × 1100 px" height={360} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-2.5 mt-3">
              <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-lg">🕌</div>
                <div>
                  <b className="text-xs text-slate-900 block">{t.home.shariahBadge}</b>
                  <span className="text-[11px] text-slate-500">{t.home.shariahSub}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-lg">🛡️</div>
                <div>
                  <b className="text-xs text-slate-900 block">{t.home.amanatBadge}</b>
                  <span className="text-[11px] text-slate-500">{t.home.amanatSub}</span>
                </div>
              </div>
            </div>
            <div className="float-card fc-1 hidden lg:flex">
              <div className="ico">🕌</div>
              <div><b>{t.home.shariahBadge}</b><span>{t.home.shariahSub}</span></div>
            </div>
            <div className="float-card fc-2 hidden lg:flex">
              <div className="ico">🛡️</div>
              <div><b>{t.home.amanatBadge}</b><span>{t.home.amanatSub}</span></div>
            </div>
          </Reveal>
        </div>
      </header>

      <Marquee items={marqueeList} />

      {/* ABOUT TEASER */}
      <section id="about">
        <div className="container grid-2">
          <Reveal><ImgHolder label={isBn ? 'প্রতিষ্ঠাতা সদস্যদের ছবি' : 'Founding Members Photo'} size="800 × 900 px" height={440} /></Reveal>
          <div>
            <SectionHead
              tag={t.home.aboutTag}
              title={<>{t.home.aboutTitle} <span className="g">{t.home.aboutTitleAccent}</span></>}
              sub={t.home.aboutSub}
            />
            <div className="pill-row">
              {(isBn
                ? ['সম্পূর্ণ অরাজনৈতিক', 'পারস্পরিক সহযোগিতা', 'জনকল্যাণ', 'ক্ষুদ্র বিনিয়োগ', 'সমবায় সমিতি']
                : ['Non-political', 'Mutual Aid', 'Welfare', 'Micro-Investment', 'Cooperative']
              ).map((p) => (<span key={p} className="pill">{p}</span>))}
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                ['🤝', t.home.val1Title, t.home.val1Desc],
                ['🏛️', t.home.val2Title, t.home.val2Desc],
                ['🌱', t.home.val3Title, t.home.val3Desc],
              ].map(([e, tit, d], i) => (
                <Reveal key={tit} delay={i * 100}>
                  <div className="value-card"><div className="ico">{e}</div><div><b>{tit}</b><p>{d}</p></div></div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES TEASER */}
      <section className="principles">
        <div className="container">
          <SectionHead
            center
            tag={t.home.principlesTag}
            title={<>{t.home.principlesTitle} <span className="g">{t.home.principlesTitleAccent}</span></>}
            sub={t.home.principlesSub}
          />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {CLAUSES_I18N.slice(1, 4).concat(CLAUSES_I18N[17]).map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="pr-card">
                  <div className="pr-num">{String(c.n).padStart(2, '0')}</div>
                  <h3>{c.t[lang]}</h3>
                  <p>{c.x[lang]}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="center" style={{ marginTop: 40 }}>
              <Link href="/constitution" className="btn btn-green">{t.home.btnAllClauses}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GOVERNANCE TEASER */}
      <section>
        <div className="container">
          <SectionHead
            center
            tag={t.leadership.orgTag}
            title={<>{t.leadership.orgTitle} <span className="g">{t.leadership.orgTitleAccent}</span></>}
          />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['tier-1', '🧭', t.leadership.orgAdvisor, 'উপদেষ্টা পরিষদ', t.leadership.orgAdvisorSub],
              ['tier-2', '⚙️', t.leadership.orgPresident, 'কার্যনির্বাহী পরিষদ', t.leadership.orgPresidentSub],
              ['tier-3', '📈', isBn ? 'বিনিয়োগ বোর্ড' : 'Investment Board', 'বিনিয়োগ বোর্ড', isBn ? 'প্রধান উপদেষ্টার নেতৃত্বে হালাল বিনিয়োগ পরিচালনাকারী যৌথ বোর্ড।' : 'Joint board headed by the Chief Advisor deciding halal investments.'],
            ].map(([cls, em, tit, bn, d], i) => (
              <Reveal key={tit} delay={i * 100}>
                <div className={`tier ${cls}`}><span className="em">{em}</span><h3>{tit}</h3><span className="bn">{bn}</span><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WELFARE */}
      <section className="welfare">
        <div className="container">
          <SectionHead
            center
            light
            tag={isBn ? 'কল্যাণ ও শৃঙ্খলা' : 'Welfare & Discipline'}
            title={<>{isBn ? 'বিশ্বাসের ভিত্তিতে প্রতিষ্ঠিত, ' : 'Built on Trust, '}<span style={{ color: '#a7f3d0' }}>{isBn ? 'শৃঙ্খলার সাথে পরিচালিত' : 'Run with Discipline'}</span></>}
            sub={isBn ? 'প্রতিটি স্তরে জবাবদিহিতা ও স্বচ্ছতা—কারণ আপনার আমানত আমাদের পবিত্র দায়িত্ব।' : 'Checks and balances at every level — because your Amanat is our sacred responsibility.'}
          />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['🕯️', isBn ? 'শোক ও কল্যাণ সহায়তা' : 'Bereavement Welfare', isBn ? 'সদস্যের ইন্তেকালে তাঁর পরিবারের জন্য সদস্যপ্রতি ঐচ্ছিক মাসিক ২০০ টাকা সহায়তা—যা অন্তরের আন্তরিকতা থেকে।' : 'Voluntary BDT 200/month per member to the bereaved family — never forced, always from the heart.'],
              ['📅', isBn ? 'নিয়মিত মাসিক সভা' : 'Monthly Meetings', isBn ? 'প্রতি ৩০ দিন অন্তর নির্বাহী সভা—সকল জমা যাচাই ও রেজুলেশন খাতায় সংরক্ষণ বাধ্যতামূলক।' : 'A mandatory formal Executive meeting every 30 days — deposits recorded, minutes preserved.'],
              ['🔐', isBn ? 'যৌথ হিসাব ও ভারসাম্য' : 'Checks & Balances', isBn ? 'অর্থ উত্তোলনে যৌথ রেজুলেশন ও চেক নম্বর প্রয়োজন; চেক বই থাকে অ-স্বাক্ষরকারীর হেফাজতে।' : 'Withdrawals need a joint resolution with purpose & cheque number; chequebook kept by a non-signatory.'],
            ].map(([em, tit, d], i) => (
              <Reveal key={tit} delay={i * 100}>
                <div className="wf-card"><span className="em">{em}</span><h3>{tit}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container">
          <Reveal>
            <div className="cta-box">
              <h2>{isBn ? 'দশে মিলে করি কাজ, হারি জিতি নাহি লাজ।' : 'Many a Little Makes a Mickle.'}</h2>
              <p>
                {isBn
                  ? 'আজই আপনার সঞ্চয় ও অর্থনৈতিক মুক্তির যাত্রা শুরু করুন। আপনার ক্ষুদ্র মাসিক সঞ্চয় গড়ে তুলবে আত্মনির্ভরশীলতার সুউচ্চ পাহাড়—ইনশাআল্লাহ।'
                  : 'Start your journey toward collective self-reliance today. Your small monthly saving becomes a mountain of mutual strength — insha’Allah.'}
              </p>
              <Link href="/membership" className="btn btn-white">
                {isBn ? 'সদস্যপদের আবেদন করুন →' : 'Apply for Membership →'}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

