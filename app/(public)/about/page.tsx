import React from 'react';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import SectionHead from '@/components/public/section-head';

export default function AboutPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">About Us</span>
          <h1 className="sec-title">Our Story, Vision & <span className="g">Philosophy</span></h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>In the name of Allah, the Most Gracious, the Most Merciful.</p>
        </div>
      </div>

      <section>
        <div className="container grid-2">
          <Reveal><ImgHolder label="Society Gathering Photo" size="800 × 900 px" height={460} /></Reveal>
          <div>
            <SectionHead tag="Preamble" title={<>A Constitution of <span className="g">Gratitude & Trust</span></>} />
            <Reveal delay={200}>
              <p className="sec-sub">With boundless gratitude to the Almighty Creator and Sustainer of this world and the Hereafter, this Constitution of Al-Amanah Savings and Welfare Society is adopted to govern the aims, objectives, procedures, and institutional structure of the society.</p>
            </Reveal>
            <div className="pill-row">
              {['Non-political', 'Mutual-aid', 'Welfare', 'Micro-investment', 'Cooperative'].map((p) => (<span key={p} className="pill">{p}</span>))}
            </div>
          </div>
        </div>
      </section>

      <section className="principles">
        <div className="container">
          <SectionHead center tag="Core Aims & Objectives" title={<>Why We <span className="g">Exist</span></>} />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {[
              ['🤝', 'Strength in Unity', 'Founded on “Unity is strength” and “Many a little makes a mickle” — tiny grains of sand and drops of water build vast continents and oceans.'],
              ['🏛️', 'Collective Over Individual', 'Prioritizing collective economic progress over individual self-interest to achieve overall self-reliance.'],
              ['🌱', 'Poverty Alleviation & Harmony', 'Fostering a modern, prosperous and ethical social status for every member through poverty reduction and mutual financial support.'],
            ].map(([e, t, d], i) => (
              <Reveal key={t} delay={i * 100}>
                <div className="pr-card"><span className="ico">{e}</span><h3>{t}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container grid-2">
          <div>
            <SectionHead tag="Significance of the Name" title={<>“Amanah” — The Sacred <span className="g">Trust</span></>} />
            <Reveal delay={200}>
              <p className="sec-sub">The society serves as a collective platform of hardworking, forward-thinking social reformers and middle-class individuals acting as vigilant guardians — <em>“Atondro Prohori”</em> — to secure economic liberation and eliminate poverty in a non-political setting.</p>
            </Reveal>
            <Reveal delay={300}>
              <div className="motto" style={{ marginTop: 24 }}>
                <p className="serif">“And those who are faithfully true to their trusts (Amanat) and to their covenants.”</p>
                <span>— Surah Al-Mu’minun [23:8]</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}><ImgHolder label="Community Welfare Photo" size="800 × 600 px" height={380} /></Reveal>
        </div>
      </section>
    </>
  );
}
