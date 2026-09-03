'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

export default function DocumentsPage() {
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  const sampleMonths = isBn
    ? ['জুলাই ২০২৬', 'আগস্ট ২০২৬', 'সেপ্টেম্বর ২০২৬', 'অক্টোবর ২০২৬']
    : ['July 2026', 'August 2026', 'September 2026', 'October 2026'];

  const sampleDates = isBn
    ? ['০৫/০৭/২৬', '০৪/০৮/২৬', '০৬/০৯/২৬', '০৫/১০/২৬']
    : ['05/07/26', '04/08/26', '06/09/26', '05/10/26'];

  const sampleDeposit = isBn ? '৫০০ /-' : '500 /-';
  const sampleSignature = isBn ? 'স্বাক্ষরিত ✓' : 'Signed ✓';

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.documents.heroTag}</span>
          <h1 className="sec-title">
            {t.documents.heroTitle} <span className="g">{t.documents.heroTitleAccent}</span>
          </h1>
          <button className="btn btn-green no-print" style={{ marginTop: 22 }} onClick={() => window.print()}>
            {t.documents.btnPrint}
          </button>
        </div>
      </div>

      <section>
        <div className="container" style={{ display: 'grid', gap: 60, maxWidth: 900 }}>

          {/* Membership form */}
          <Reveal>
            <div className="doc-sheet">
              <div className="doc-head">
                <h3>{isBn ? 'আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি' : 'AL-AMANAH SAVINGS AND WELFARE SOCIETY'}</h3>
                <p>{t.nav.address} • {t.nav.tagline}</p>
                <p style={{ fontWeight: 800, marginTop: 8, color: 'var(--green-700)' }}>
                  {t.documents.formTitle}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 24 }}>
                <div className="doc-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div>
                    <b>{t.documents.formApplicant}</b> {isBn ? 'মোঃ সাজিদ ইশতিয়াক' : 'Md. Sazid Istiaq'}
                  </div>
                  <div>
                    <b>{t.documents.formFather}</b> {isBn ? 'মোঃ আনোয়ার উদ্দীন' : 'Md. Anwar Uddin'}
                  </div>
                  <div>
                    <b>{t.documents.formMother}</b> {isBn ? 'রুবিনা আক্তার' : 'Rubina Akter'}
                  </div>
                  <div>
                    <b>{t.documents.formPresent}</b>{' '}
                    {isBn ? '১০/১০/১ শরৎ গুপ্ত রোড, নারিন্দা, ঢাকা সদর, গেন্ডারিয়া, ঢাকা' : '10/10/1 Sarat Gupta Road, Narinda, Dhaka Sadar, Gendaria, Dhaka'}
                  </div>
                  <div>
                    <b>{t.documents.formPermanent}</b>{' '}
                    {isBn ? 'বাচ্চু মিয়া, নায়েরপুর, মহাজনরহাট, জোরারগঞ্জ, চট্টগ্রাম' : 'Bachchu Miah, Nayerpur, Mahajanerhat, Zorarganj, Chittagong'}
                  </div>
                  <div>
                    <b>{t.documents.formContact}</b>{' '}
                    {isBn ? '+৮৮০১৮৭৭৩১০৯৯৭ • +৮৮০১৫২১৫৮৪৪৪৯ (হোয়াটসঅ্যাপ)' : '+8801877310997 • +8801521584449 (WhatsApp)'}
                  </div>
                  <div>
                    <b>{t.documents.formNominee}</b>{' '}
                    {isBn ? 'মোঃ মেহেদী ইশতিয়াক (ভাই) — জাতীয় পরিচয়পত্র: ৭৫৬৭৫২৬৮৮৩' : 'Md. Mehedi Istiaq (Brother) — NID: 7567526883'}
                  </div>
                  <div>
                    <b>{t.documents.formProfession}</b>{' '}
                    {isBn ? 'চাকুরীজীবী — আকার আইটি, উত্তরা, ঢাকা' : 'Service Holder — Akar IT, Uttara, Dhaka'}
                  </div>
                  <div>
                    {isBn ? (
                      <>
                        <b>{t.documents.formNid}</b> ৬৪৬৫২১৯১৭৫ • <b>১২. জন্ম তারিখ:</b> ১৮/০৭/২০০১ • <b>১৩. রক্তের গ্রুপ:</b> বি+ (B+)
                      </>
                    ) : (
                      <>
                        <b>{t.documents.formNid}</b> 6465219175 • <b>{t.documents.formDob}</b> 18/07/2001 • <b>{t.documents.formBlood}</b> B+
                      </>
                    )}
                  </div>
                  <div>
                    <b>{t.documents.formNationality}</b> {isBn ? 'বাংলাদেশী' : 'Bangladeshi'} • <b>{t.documents.formReligion}</b> {isBn ? 'ইসলাম' : 'Islam'}
                  </div>
                </div>
                <div className="photo-box">
                  {isBn ? 'পাসপোর্ট সাইজের ছবি এখানে সংযুক্ত করুন' : 'AFFIX PASSPORT PHOTO HERE'}
                </div>
              </div>
              <p style={{ fontSize: 12.5, marginTop: 18, lineHeight: 1.7, color: 'var(--muted)' }}>
                <b style={{ color: 'var(--green-800)' }}>{t.documents.formPledgeLabel}</b> {t.documents.formPledgeText}
              </p>
              <div className="sig-row">
                <span>{t.documents.sigTreasurer}</span>
                <span>{t.documents.sigGS}</span>
                <span>{t.documents.sigPresident}</span>
              </div>
            </div>
          </Reveal>

          {/* Passbook */}
          <Reveal delay={100}>
            <div className="doc-sheet">
              <div className="doc-head">
                <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <h3>{t.documents.passbookTitle}</h3>
                <p>{isBn ? 'আল-আমানাহ সঞ্চয় ও কল্যাণ সোসাইটি • প্রতিষ্ঠা: ১ জুলাই, ২০২৬' : 'AL-AMANAH SAVINGS AND WELFARE SOCIETY • Established: July 01, 2026'}</p>
              </div>
              {[0, 1].map((k) => (
                <table className="doc-table" key={k} style={{ marginBottom: 26 }}>
                  <thead>
                    <tr>
                      <th>{t.documents.colMonth}</th>
                      <th>{t.documents.colDate}</th>
                      <th>{t.documents.colDeposit}</th>
                      <th>{t.documents.colCollectorSig}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleMonths.map((m, i) => (
                      <tr key={i}>
                        <td style={{ height: 34 }}>{m}</td>
                        <td>{sampleDates[i]}</td>
                        <td>{sampleDeposit}</td>
                        <td>{sampleSignature}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>{t.documents.specialFund}</td>
                      <td>{isBn ? '০' : '0'}</td>
                      <td colSpan={2}>{isBn ? 'জরুরী কল্যাণ জমা: প্রযোজ্য নয়' : 'Emergency Fund: N/A'}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}>
                        <b>{isBn ? 'সর্বমোট জমাকৃত সঞ্চয়ের পরিমাণ: ২,০০০/- টাকা' : 'Total Deposited Cumulative Amount: BDT 2,000/-'}</b>
                      </td>
                      <td colSpan={2}>
                        <b>{t.documents.treasurerSigSeal}</b> {isBn ? 'যাচাইকৃত ও অনুমোদিত' : 'Verified & Approved'}
                      </td>
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
