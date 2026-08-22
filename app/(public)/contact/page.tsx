'use client';
import React, { useState } from 'react';
import Reveal from '@/components/public/reveal';
import ImgHolder from '@/components/public/img-holder';
import SectionHead from '@/components/public/section-head';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">Contact</span>
          <h1 className="sec-title">We Are Here <span className="g">For You</span></h1>
        </div>
      </div>

      <section>
        <div className="container grid-2" style={{ alignItems: 'start', gap: 50 }}>
          <div>
            <SectionHead tag="Principal Address" title={<>Visit or <span className="g">Write to Us</span></>} />
            <Reveal delay={150}>
              <div className="check-card" style={{ marginTop: 26 }}>
                <ul className="check-list">
                  <li><span className="tick">📍</span>Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211, Bangladesh</li>
                  <li><span className="tick">🕰️</span>Executive meeting every 30 days — visits by appointment.</li>
                  <li><span className="tick">✉️</span>Membership & general queries addressed to the President.</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <div style={{ marginTop: 20 }}>
                <ImgHolder label="Office / Map Snapshot" size="800 × 400 px" height={240} className="no-print" />
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="check-card">
              <h3 style={{ fontSize: 20, marginBottom: 20 }}>Send a Message</h3>
              {sent ? (
                <div className="fee-strip" style={{ background: 'var(--green-100)', borderColor: 'var(--green-500)', color: 'var(--green-800)' }}>
                  ✅ JazakAllah! Your message has been recorded. The General Secretary will contact you soon.
                </div>
              ) : (
                <form
                  className="no-print"
                  style={{ display: 'grid', gap: 16 }}
                  onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                >
                  <div><label className="f">Your Name</label><input className="input" required placeholder="Full name" /></div>
                  <div><label className="f">Mobile / Email</label><input className="input" required placeholder="+8801XXXXXXXXX" /></div>
                  <div>
                    <label className="f">I am interested in</label>
                    <select className="input">
                      <option>Becoming a Member</option>
                      <option>Welfare Support</option>
                      <option>General Query</option>
                    </select>
                  </div>
                  <div><label className="f">Message</label><textarea className="input" rows={4} required placeholder="Write your message..." /></div>
                  <button className="btn btn-green" type="submit">Send Message →</button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
