import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <p style={{ textAlign: 'center', fontSize: 20, marginBottom: 34 }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <div className="foot-grid">
          <div>
            <h4>Al-Amanah Society</h4>
            <p className="bn" style={{ marginBottom: 10 }}>আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি</p>
            <p>A non-political, mutual-aid, welfare and micro-investment cooperative society established on July 01, 2026.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/constitution">Constitution</Link></li>
              <li><Link href="/leadership">Leadership</Link></li>
              <li><Link href="/membership">Membership</Link></li>
              <li><Link href="/documents">Documents</Link></li>
              <li><Link href="/login">Portal Login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Bank Signatories</h4>
            <ul><li>Md. Jewel Khan</li><li>Md. Yusuf</li><li>Md. Babul Miah</li></ul>
          </div>
          <div>
            <h4>Contact</h4>
            <p>Munshihati (2nd Floor, Holy Touch Ideal School), Kamrangirchar, Dhaka – 1211, Bangladesh</p>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Al-Amanah Savings and Welfare Society. All rights reserved.</span>
          <span className="serif">“Faithful to our trusts and covenants.” — [23:8]</span>
        </div>
      </div>
    </footer>
  );
}
