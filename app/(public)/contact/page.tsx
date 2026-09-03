'use client';
import React, { useState } from 'react';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import SectionHead from '@/components/public/section-head';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.contact.heroTag}</span>
          <h1 className="sec-title">
            {t.contact.heroTitle} <span className="g">{t.contact.heroTitleAccent}</span>
          </h1>
        </div>
      </div>

      <section>
        <div className="container grid-2" style={{ alignItems: 'start', gap: 50 }}>
          <div>
            <SectionHead
              tag={t.contact.principalAddressTag}
              title={<>{t.contact.principalAddressTitle} <span className="g">{t.contact.principalAddressTitleAccent}</span></>}
            />
            <Reveal delay={150}>
              <div className="check-card" style={{ marginTop: 26 }}>
                <ul className="check-list">
                  <li>
                    <span className="tick">📍</span>
                    {t.contact.addressLine1}
                  </li>
                  <li>
                    <span className="tick">🕰️</span>
                    {t.contact.addressLine2}
                  </li>
                  <li>
                    <span className="tick">✉️</span>
                    {t.contact.addressLine3}
                  </li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div style={{ marginTop: 20 }}>
                <ImgHolder
                  label={isBn ? 'কার্যালয় / মানচিত্রের অবস্থান' : 'Office / Map Snapshot'}
                  size={isBn ? '৮০০ × ৪০০ পিক্সেল' : '800 × 400 px'}
                  height={240}
                  className="no-print"
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="check-card">
              <h3 style={{ fontSize: 20, marginBottom: 20 }}>{t.contact.formHeading}</h3>
              {sent ? (
                <div
                  className="fee-strip"
                  style={{ background: 'var(--green-100)', borderColor: 'var(--green-500)', color: 'var(--green-800)' }}
                >
                  {t.contact.successMessage}
                </div>
              ) : (
                <form
                  className="no-print"
                  style={{ display: 'grid', gap: 16 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                >
                  <div>
                    <label className="f">{t.contact.fieldName}</label>
                    <input className="input" required placeholder={isBn ? 'আপনার পূর্ণ নাম লিখুন' : 'Full name'} />
                  </div>
                  <div>
                    <label className="f">{t.contact.fieldContact}</label>
                    <input className="input" required placeholder={isBn ? '০১XXXXXXXXX অথবা ইমেইল' : '+8801XXXXXXXXX'} />
                  </div>
                  <div>
                    <label className="f">{t.contact.fieldInterest}</label>
                    <select className="input">
                      <option>{t.contact.optMember}</option>
                      <option>{t.contact.optWelfare}</option>
                      <option>{t.contact.optQuery}</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">{t.contact.fieldMessage}</label>
                    <textarea
                      className="input"
                      rows={4}
                      required
                      placeholder={isBn ? 'আপনার বার্তা এখানে লিখুন...' : 'Write your message...'}
                    />
                  </div>
                  <button className="btn btn-green" type="submit">
                    {t.contact.btnSend}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
