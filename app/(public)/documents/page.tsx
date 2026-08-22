'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import SectionHead from '@/components/public/section-head';

export default function DocumentsPage() {
  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">Document Templates</span>
          <h1 className="sec-title">Official Forms & <span className="g">Passbook Layout</span></h1>
          <button className="btn btn-green no-print" style={{ marginTop: 22 }} onClick={() => window.print()}>🖨️ Print / Save PDF</button>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: 'grid', gap: 60, maxWidth: 900 }}>

          {/* Membership form */}
          <Reveal>
            <div className="doc-sheet">
              <div className="doc-head">
                <h3>AL-AMANAH SAVINGS AND WELFARE SOCIETY</h3>
                <p>Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka-1211 • Established: July 01, 2026</p>
                <p style={{ fontWeight: 800, marginTop: 8, color: 'var(--green-700)' }}>MEMBERSHIP FORM (Sample Case File)</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 24 }}>
                <div className="doc-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div><b>01. Applicant:</b> মোঃ সাজিদ ইশতিয়াক — Md. Sazid Istiaq</div>
                  <div><b>02. Father:</b> Md. Anwar Uddin (মোঃ আনোয়ার উদ্দীন)</div>
                  <div><b>03. Mother:</b> Rubina Akter (রুবিনা আক্তার)</div>
                  <div><b>05. Present Address:</b> 10/10/1 Sarat Gupta Road, Narinda, Dhaka Sadar, Gendaria, Dhaka</div>
                  <div><b>06. Permanent Address:</b> Bachchu Miah, Nayerpur, Mahajanerhat, Zorarganj, Chittagong</div>
                  <div><b>07. Contact:</b> +8801877310997 • +8801521584449 (WhatsApp)</div>
                  <div><b>08. Nominee:</b> Md. Mehedi Istiaq (ভাই) — NID: 7567526883</div>
                  <div><b>09. Profession:</b> Service Holder (চাকুরীজীবী) — Akar IT, Uttara, Dhaka</div>
                  <div><b>11. NID:</b> 6465219175 • <b>12. DOB:</b> 18/07/2001 • <b>13. Blood:</b> B+</div>
                  <div><b>14. Nationality:</b> Bangladeshi • <b>15. Religion:</b> Islam</div>
                </div>
                <div className="photo-box">AFFIX PASSPORT PHOTO HERE</div>
              </div>
              <p style={{ fontSize: 12.5, marginTop: 18, lineHeight: 1.7, color: 'var(--muted)' }}>
                <b style={{ color: 'var(--green-800)' }}>16. Solemn Pledge:</b> “I have read and fully understood the constitution and principles of Al-Amanah Savings and Welfare Society and solemnly pledge to faithfully abide by all its rules and regulations.”
              </p>
              <div className="sig-row"><span>Treasurer</span><span>General Secretary</span><span>President</span></div>
            </div>
          </Reveal>

          {/* Passbook */}
          <Reveal delay={100}>
            <div className="doc-sheet">
              <div className="doc-head">
                <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <h3>Monthly Subscription Ledger / Passbook</h3>
                <p>AL-AMANAH SAVINGS AND WELFARE SOCIETY • Established: July 01, 2026</p>
              </div>
              {[0, 1].map((k) => (
                <table className="doc-table" key={k} style={{ marginBottom: 26 }}>
                  <thead>
                    <tr><th>Month</th><th>Date</th><th>Monthly Deposit (BDT)</th><th>Collector’s Signature</th></tr>
                  </thead>
                  <tbody>
                    {[...Array(4)].map((_, i) => (
                      <tr key={i}><td style={{ height: 34 }}>&nbsp;</td><td></td><td></td><td></td></tr>
                    ))}
                    <tr><td>Special Fund:</td><td></td><td colSpan={2}></td></tr>
                    <tr>
                      <td colSpan={2}><b>Total Deposited Cumulative Amount: BDT …………</b></td>
                      <td colSpan={2}><b>Treasurer’s Signature & Seal:</b></td>
                    </tr>
                  </tbody>
                </table>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
