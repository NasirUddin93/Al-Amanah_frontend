import React from 'react';
import Reveal from '@/components/public/reveal';
import SectionHead from '@/components/public/section-head';

export default function MembershipPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">Membership</span>
          <h1 className="sec-title">Join the <span className="g">Family of Guardians</span></h1>
          <p className="sec-sub" style={{ marginInline: 'auto' }}>Open to every permanent citizen of Bangladesh who pledges unconditional adherence to the society’s Constitution.</p>
        </div>
      </div>

      <section className="membership">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'start', gap: 50 }}>
            <Reveal>
              <div className="check-card">
                <h3 style={{ fontSize: 20, marginBottom: 20 }}>✅ Eligibility & Documents</h3>
                <ul className="check-list">
                  {[
                    'Permanent citizen of Bangladesh.',
                    'Pledge to follow all rules & regulations of the Constitution.',
                    '1 photocopy of National ID / Voter ID card.',
                    '2 passport-size photographs of the applicant.',
                    '1 passport-size photograph of the nominee.',
                    'Prescribed Membership Form addressed to the President.',
                    'Immediate notification upon any address change.',
                  ].map((t) => (<li key={t}><span className="tick">✓</span>{t}</li>))}
                </ul>
                <div className="fee-strip">💳 Non-refundable application form fee: <b>BDT 200</b></div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div>
                {[
                  ['01', 'Submit Application', 'Complete the prescribed Membership Form addressed to the President with all attachments.'],
                  ['02', 'Pay Admission Fee', 'Pay the BDT 200 form fee and attach NID copy, photographs and nominee details.'],
                  ['03', 'Verification & Approval', 'The Executive Council reviews, verifies and formally approves enrollment with a Membership ID.'],
                  ['04', 'Enjoy Full Rights', 'Full voting rights in elections and proportionate profit/loss sharing from your joining date.'],
                ].map(([n, t, d]) => (
                  <div className="step" key={n}>
                    <div className="step-num">{n}</div>
                    <div><b>{t}</b><p>{d}</p></div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="cta-box" style={{ marginTop: 70 }}>
              <h2>Resignation & Settlement Policy</h2>
              <p>Written resignation to the President → inquiry committee review (Executive Council + Investment Board) → Executive decision is final & binding → all settlements finalized within <b>15 days</b>, subject to reserve liquidity. Re-joining members forfeit the “Founding Member” status.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
