import React from 'react';
import Reveal from '@/components/public/reveal';
import SectionHead from '@/components/public/section-head';
import { EXEC_COMMITTEE, ADVISORY_COUNCIL, APPROVING_EXEC, APPROVING_ADVISORY, SIGNATORIES, ROLES } from '@/lib/site-data';

const initials = (n: string) => n.replace('Md. ', '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function LeadershipPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">Governance & Leadership</span>
          <h1 className="sec-title">The People & <span className="g">Structure You Trust</span></h1>
        </div>
      </div>

      {/* Org chart */}
      <section>
        <div className="container">
          <SectionHead center tag="Organizational Chart" title={<>Three-Tier <span className="g">Governance</span></>} />
          <Reveal delay={150}>
            <div className="org" style={{ marginTop: 50 }}>
              <div className="org-node"><b>Chief Advisor & Advisory Council</b><span>Consults / Guides</span></div>
              <div className="org-line" />
              <div className="org-node"><b>President</b><span>Directs / Coordinates • Casting vote in ties</span></div>
              <div className="org-line" />
              <div className="org-node"><b>General Secretary</b><span>Minutes • Notices • Budgets • Execution</span></div>
              <div className="org-line" />
              <div className="org-row">
                <div className="org-node"><b>Vice President</b></div>
                <div className="org-node"><b>Joint Secretary</b></div>
                <div className="org-node"><b>Treasurer & Asst.</b></div>
                <div className="org-node"><b>Organizing & Publicity Sec.</b></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Executive committee */}
      <section className="principles">
        <div className="container">
          <SectionHead center tag="কার্যনির্বাহী পরিষদ" title={<>Executive <span className="g">Committee</span></>} />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {EXEC_COMMITTEE.map((m, i) => (
              <Reveal key={m.sl} delay={(i % 3) * 100}>
                <div className="lead-card">
                  <div className="avatar">{initials(m.name)}</div>
                  <div><b>{m.name}</b><span className="pos">{m.en}</span><span className="bn">{m.bn}</span></div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150}>
            <div style={{ marginTop: 34 }}>
              <h3 style={{ marginBottom: 12 }}>Approving Signatory Members (Executive Level)</h3>
              <div className="pill-row">{APPROVING_EXEC.map((n) => (<span key={n} className="pill">{n}</span>))}</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Advisory */}
      <section>
        <div className="container">
          <SectionHead center tag="উপদেষ্টা পরিষদ" title={<>Advisory <span className="g">Council</span></>} />
          <div className="grid-4" style={{ marginTop: 50 }}>
            {ADVISORY_COUNCIL.map((n, i) => (
              <Reveal key={n} delay={(i % 4) * 100}>
                <div className="lead-card"><div className="avatar">{initials(n)}</div><div><b>{n}</b><span className="pos">Member Advisor</span></div></div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <div style={{ marginTop: 30 }}>
              <h3 style={{ marginBottom: 12 }}>Approving Signatory Members (Advisory Level)</h3>
              <div className="pill-row">{APPROVING_ADVISORY.map((n) => (<span key={n} className="pill">{n}</span>))}</div>
              <h3 style={{ margin: '26px 0 12px' }}>Designated Bank Account Operators (Joint Signatories)</h3>
              <div className="pill-row">{SIGNATORIES.map((n) => (<span key={n} className="pill" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: '#92400e' }}>️ {n}</span>))}</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Roles & duties */}
      <section className="principles">
        <div className="container" style={{ maxWidth: 860 }}>
          <SectionHead center tag="Roles, Powers & Duties" title={<>Executive <span className="g">Portfolios</span></>} />
          <div style={{ display: 'grid', gap: 14, marginTop: 50 }}>
            {ROLES.map((r, i) => (
              <Reveal key={r.en} delay={i * 60}>
                <details className="role">
                  <summary>{r.en}<span className="bn">{r.bn}</span></summary>
                  <div className="body"><ul>{r.pts.map((p) => (<li key={p}>{p}</li>))}</ul></div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
