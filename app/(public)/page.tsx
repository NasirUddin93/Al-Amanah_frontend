import React from 'react';
import Link from 'next/link';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import Counter from '@/components/public/counter';
import Marquee from '@/components/public/marquee';
import SectionHead from '@/components/public/section-head';
import { MARQUEE_ITEMS, CLAUSES } from '@/lib/site-data';

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <header className="hero">
        <div className="blob" style={{ width: 420, height: 420, background: 'var(--green-200)', top: -120, right: -80 }} />
        <div className="blob" style={{ width: 320, height: 320, background: '#bbf7d0', bottom: -100, left: -90, animationDelay: '3s' }} />
        <div className="container hero-grid">
          <div>
            <span className="hero-badge">🌙 A Sacred Trust — “Amanat” • Est. 2026</span>
            <Reveal delay={100}><h1>Saving Together,<br /><span className="grad">Growing Together,</span><br />Caring Forever.</h1></Reveal>
            <Reveal delay={200}><p className="bn" style={{ color: 'var(--green-700)', fontWeight: 600, fontSize: 18, marginBottom: 14 }}>আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি — ঐক্যই শক্তি</p></Reveal>
            <Reveal delay={200}>
              <p className="lead">A non-political, mutual-aid, welfare and micro-investment cooperative society — built on unity, Shariah-compliant values and the belief that <em>“many a little makes a mickle.”</em></p>
            </Reveal>
            <Reveal delay={300}>
              <div className="motto">
                <p className="serif">“And those who are faithfully true to their trusts (Amanat) and to their covenants.”</p>
                <span>— Surah Al-Mu’minun [23:8]</span>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="hero-cta">
                <Link href="/membership" className="btn btn-green">Become a Member</Link>
                <Link href="/constitution" className="btn btn-ghost">Read Our Constitution</Link>
              </div>
            </Reveal>
            <Reveal delay={400}>
              <div className="hero-stats">
                <div className="stat"><b><Counter to={2026} /></b><span>Established</span></div>
                <div className="stat"><b><Counter to={5} /></b><span>Year Tenure</span></div>
                <div className="stat"><b><Counter to={30} /></b><span>Day Meetings</span></div>
                <div className="stat"><b><Counter to={100} suffix="%" /></b><span>Halal Invest</span></div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="hero-visual">
            <ImgHolder label="Society Group Photo" size="900 × 1100 px" height={480} />
            <div className="float-card fc-1"><div className="ico">🕌</div><div><b>Shariah-Compliant</b><span>Interest-free investment</span></div></div>
            <div className="float-card fc-2"><div className="ico">🛡️</div><div><b>Amanat Principle</b><span>Deposits as sacred trust</span></div></div>
          </Reveal>
        </div>
      </header>

      <Marquee items={MARQUEE_ITEMS} />

      {/* ABOUT TEASER */}
      <section id="about">
        <div className="container grid-2">
          <Reveal><ImgHolder label="Founding Members Photo" size="800 × 900 px" height={440} /></Reveal>
          <div>
            <SectionHead tag="Who We Are" title={<>A Collective Platform of <span className="g">Guardians of Economic Liberation</span></>}
              sub="Hardworking, forward-thinking social reformers and middle-class individuals — the vigilant guardians (“Atondro Prohori”) — securing economic freedom and eliminating poverty in a strictly non-political setting." />
            <div className="pill-row">
              {['Non-political', 'Mutual Aid', 'Welfare', 'Micro-Investment', 'Cooperative'].map((p) => (<span key={p} className="pill">{p}</span>))}
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                ['🤝', 'Strength in Unity', 'Tiny grains of sand and drops of water build vast continents and oceans — small savings create great strength.'],
                ['🏛️', 'Collective Over Individual', 'Prioritizing collective economic progress over individual self-interest to achieve overall self-reliance.'],
                ['🌱', 'Poverty Alleviation & Social Harmony', 'Fostering a modern, prosperous and ethical social status for every member through mutual financial support.'],
              ].map(([e, t, d], i) => (
                <Reveal key={t} delay={i * 100}>
                  <div className="value-card"><div className="ico">{e}</div><div><b>{t}</b><p>{d}</p></div></div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES TEASER */}
      <section className="principles">
        <div className="container">
          <SectionHead center tag="Constitution Highlights" title={<>The Principles That <span className="g">Govern Us</span></>}
            sub="Every operation strictly follows our binding Constitution — amended only by majority vote." />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {CLAUSES.slice(1, 4).concat(CLAUSES[17]).map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="pr-card"><div className="pr-num">{String(c.n).padStart(2, '0')}</div><h3>{c.t}</h3><p>{c.x}</p></div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="center" style={{ marginTop: 40 }}>
              <Link href="/constitution" className="btn btn-green">Explore All 19 Clauses →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GOVERNANCE TEASER */}
      <section>
        <div className="container">
          <SectionHead center tag="Three-Tier Governance" title={<>Structured. Accountable. <span className="g">Elected.</span></>} />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['tier-1', '🧭', 'Advisory Council', 'উপদেষ্টা পরিষদ', 'Guides policy, oversees affairs, designates bank signatories.'],
              ['tier-2', '⚙️', 'Executive Council', 'কার্যনির্বাহী পরিষদ', 'Executes daily operations; mandatory meetings every 30 days.'],
              ['tier-3', '📈', 'Investment Board', 'বিনিয়োগ বোর্ড', 'Joint board headed by the Chief Advisor deciding halal investments.'],
            ].map(([cls, em, t, bn, d], i) => (
              <Reveal key={t} delay={i * 100}>
                <div className={`tier ${cls}`}><span className="em">{em}</span><h3>{t}</h3><span className="bn">{bn}</span><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WELFARE */}
      <section className="welfare">
        <div className="container">
          <SectionHead center light tag="Welfare & Discipline" title={<>Built on Trust, <span style={{ color: '#a7f3d0' }}>Run with Discipline</span></>}
            sub="Checks and balances at every level — because your Amanat is our sacred responsibility." />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['🕯️', 'Bereavement Welfare', 'Voluntary BDT 200/month per member to the bereaved family — never forced, always from the heart.'],
              ['📅', 'Monthly Meetings', 'A mandatory formal Executive meeting every 30 days — deposits recorded, minutes preserved.'],
              ['🔐', 'Checks & Balances', 'Withdrawals need a joint resolution with purpose & cheque number; chequebook kept by a non-signatory.'],
            ].map(([em, t, d], i) => (
              <Reveal key={t} delay={i * 100}>
                <div className="wf-card"><span className="em">{em}</span><h3>{t}</h3><p>{d}</p></div>
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
              <h2>Many a Little Makes a Mickle.</h2>
              <p>Start your journey toward collective self-reliance today. Your small monthly saving becomes a mountain of mutual strength — insha’Allah.</p>
              <Link href="/membership" className="btn btn-white">Apply for Membership →</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
