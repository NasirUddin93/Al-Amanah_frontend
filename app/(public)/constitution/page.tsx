import React from 'react';
import Reveal from '@/components/public/reveal';
import SectionHead from '@/components/public/section-head';
import { CLAUSES } from '@/lib/site-data';

export default function ConstitutionPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">Constitution & By-Laws</span>
          <h1 className="sec-title">The 19 Clauses That <span className="g">Bind Us</span></h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>A binding set of rules for all members — amendable only by majority vote at a General or extraordinary Meeting.</p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="grid-3">
            {CLAUSES.map((c, i) => (
              <Reveal key={c.n} delay={(i % 3) * 100}>
                <div className="pr-card">
                  <div className="pr-num">{String(c.n).padStart(2, '0')}</div>
                  <h3>{c.t}</h3>
                  <p>{c.x}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="cta-box" style={{ marginTop: 70 }}>
              <h2>Clause 3 — Sanctity of the Constitution</h2>
              <p>Any intentional violation of these by-laws shall be treated as an unlawful offense subject to disciplinary and legal action. Amendments require a majority vote of members present.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
