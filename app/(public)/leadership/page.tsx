'use client';
import React from 'react';
import Reveal from '@/components/public/reveal';
import SectionHead from '@/components/public/section-head';
import { useLanguage } from '@/components/language-context';
import { TRANSLATIONS } from '@/lib/translations';

const initialsEn = (n: string) =>
  n
    .replace('Md. ', '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const initialsBn = (n: string) => {
  const clean = n.replace('মোঃ ', '').replace('মো: ', '').trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0];
  }
  return clean.slice(0, 2);
};

const EXEC_COMMITTEE_I18N = [
  {
    sl: '01',
    enRole: 'President',
    bnRole: 'সভাপতি',
    name: { en: 'Md. Babul Miah', bn: 'মোঃ বাবুল মিয়া' },
  },
  {
    sl: '02',
    enRole: 'Vice President',
    bnRole: 'সহ-সভাপতি',
    name: { en: 'Md. Jewel Khan', bn: 'মোঃ জুয়েল খান' },
  },
  {
    sl: '03',
    enRole: 'General Secretary',
    bnRole: 'সাধারণ সম্পাদক',
    name: { en: 'Md. Nasir Uddin', bn: 'মোঃ নাসির উদ্দিন' },
  },
  {
    sl: '04',
    enRole: 'Joint General Secretary',
    bnRole: 'সহ-সাধারণ সম্পাদক',
    name: { en: 'Md. Monirul Islam', bn: 'মোঃ মনিরুল ইসলাম' },
  },
  {
    sl: '05',
    enRole: 'Treasurer',
    bnRole: 'কোষাধ্যক্ষ',
    name: { en: 'Md. Faizul Islam Hasan', bn: 'মোঃ ফয়জুল ইসলাম হাসান' },
  },
  {
    sl: '06',
    enRole: 'Assistant Treasurer',
    bnRole: 'সহ-কোষাধ্যক্ষ',
    name: { en: 'Md. Yusuf', bn: 'মোঃ ইউসুফ' },
  },
  {
    sl: '07',
    enRole: 'Publicity Secretary',
    bnRole: 'প্রচার সম্পাদক',
    name: { en: 'Md. Russel', bn: 'মোঃ রাসেল' },
  },
  {
    sl: '08',
    enRole: 'Asst. Publicity Secretary',
    bnRole: 'সহ-প্রচার সম্পাদক',
    name: { en: 'Md. Junayed', bn: 'মোঃ জুনায়েদ' },
  },
  {
    sl: '09',
    enRole: 'Organizing Secretary',
    bnRole: 'সাংগঠনিক সম্পাদক',
    name: { en: 'Md. Zakir Hossain', bn: 'মোঃ জাকির হোসেন' },
  },
];

const ADVISORY_COUNCIL_I18N = [
  { en: 'Md. Jewel Khan', bn: 'মোঃ জুয়েল খান' },
  { en: 'Md. Nasir Uddin', bn: 'মোঃ নাসির উদ্দিন' },
  { en: 'Md. Yusuf', bn: 'মোঃ ইউসুফ' },
  { en: 'Abdul Kader', bn: 'আব্দুল কাদের' },
  { en: 'Md. Babul Miah', bn: 'মোঃ বাবুল মিয়া' },
  { en: 'Md. Russel', bn: 'মোঃ রাসেল' },
  { en: 'Md. Faizul Islam Hasan', bn: 'মোঃ ফয়জুল ইসলাম হাসান' },
];

const APPROVING_EXEC_I18N = [
  { en: 'Farjana Farhat - Rina', bn: 'ফারজানা ফারহাত - রিনা' },
  { en: 'Samir / Ranir', bn: 'সমীর / রানির' },
  { en: 'Md. Ali', bn: 'মোঃ আলী' },
  { en: 'Md. Sohag', bn: 'মোঃ সোহাগ' },
  { en: 'Md. Abdul Kader', bn: 'মোঃ আব্দুল কাদের' },
];

const APPROVING_ADVISORY_I18N = [
  { en: 'Biplob Bepari', bn: 'বিপ্লব বেপারী' },
  { en: 'Rony', bn: 'রনি' },
  { en: 'Roksana', bn: 'রোকসানা' },
  { en: 'Dalia', bn: 'ডালিয়া' },
];

const SIGNATORIES_I18N = [
  { en: 'Md. Jewel Khan', bn: 'মোঃ জুয়েল খান' },
  { en: 'Md. Yusuf', bn: 'মোঃ ইউসুফ' },
  { en: 'Md. Babul Miah', bn: 'মোঃ বাবুল মিয়া' },
];

const ROLES_I18N = [
  {
    en: 'Chief Advisor',
    bn: 'প্রধান উপদেষ্টা',
    pts: {
      en: [
        'Leads the Advisory Council; most respected position.',
        'Oversees overall affairs; guides Executive policy.',
        'May dissolve the Executive Council in severe disputes (with the President) and initiate fresh elections.',
      ],
      bn: [
        'উপদেষ্টা পরিষদের প্রধান ও সংগঠনের সর্বোচ্চ সম্মানিত পদ।',
        'সার্বিক নীতি নির্ধারণ ও কার্যনির্বাহী পরিষদকে গঠনতান্ত্রিক পরামর্শ প্রদান।',
        'গুরুতর মতবিরোধে সভাপতির সাথে যৌথ সিদ্ধান্তে পরিষদ বিলুপ্ত করে নির্বাচন কমিশন গঠন।',
      ],
    },
  },
  {
    en: 'President',
    bn: 'সভাপতি',
    pts: {
      en: [
        'Principal head & chief representative.',
        'Presides over all meetings; instructs the General Secretary.',
        'Casting vote in exact ties; may dissolve council with Chief Advisor during disputes.',
      ],
      bn: [
        'সোসাইটির প্রধান নির্বাহী ও মূল প্রতিনিধিত্বকারী।',
        'সকল সভায় সভাপতিত্ব করা এবং সাধারণ সম্পাদককে সভার সিদ্ধান্ত বাস্তবায়নে দিকনির্দেশনা প্রদান।',
        'ভোটাভুটিতে সমতার ক্ষেত্রে কাস্টিং ভোট প্রয়োগের একক ক্ষমতা।',
      ],
    },
  },
  {
    en: 'Vice President',
    bn: 'সহ-সভাপতি',
    pts: {
      en: ['Coordinates with the President.', 'Assumes presidential duties in their absence.'],
      bn: ['সভাপতির সাথে নিয়মিত সমন্বয় রক্ষা করা।', 'সভাপতির অনুপস্থিতিতে সভাপতির সমুদয় দায়িত্ব ও ক্ষমতা পালন।'],
    },
  },
  {
    en: 'General Secretary',
    bn: 'সাধারণ সম্পাদক',
    pts: {
      en: [
        'Chief organizational & executive coordinator.',
        'Issues notices with President’s consent; keeps minutes.',
        'Prepares action plans, annual budgets, financial statements.',
      ],
      bn: [
        'সোসাইটির প্রধান প্রাতিষ্ঠানিক ও নির্বাহী সমন্বয়কারী।',
        'সভাপতির পরামর্শে সভার নোটিশ জারি ও কার্যবিবরণী (মিনিটস) সংরক্ষণ।',
        'কর্মপরিকল্পনা, বাৎসরিক বাজেট ও আর্থিক বিবরণী প্রস্তুত করা।',
      ],
    },
  },
  {
    en: 'Joint / Assistant Secretary',
    bn: 'সহ-সাধারণ সম্পাদক',
    pts: {
      en: ['Assists the General Secretary in all duties.', 'Executes assignments in consultation with the General Secretary.'],
      bn: ['সাধারণ সম্পাদককে সকল প্রাতিষ্ঠানিক দায়িত্বে সরাসরি সহায়তা করা।', 'সাধারণ সম্পাদকের পরামর্শে যেকোনো অর্পিত সাংগঠনিক দায়িত্ব সম্পাদন।'],
    },
  },
  {
    en: 'Treasurer',
    bn: 'কোষাধ্যক্ষ',
    pts: {
      en: ['Chief Financial & Accounts Officer.', 'Receives subscriptions/donations; manages bank transactions.', 'Directly accountable to membership for accounts & audits.'],
      bn: [
        'সোসাইটির প্রধান আর্থিক ও হিসাব কর্মকর্তা।',
        'চাঁদা ও অনুদান গ্রহণ, রসিদ প্রদান এবং প্রাতিষ্ঠানিক ব্যাংক লেনদেন ব্যবস্থাপনা।',
        'আর্থিক স্বচ্ছতা ও অডিট সংক্রান্ত বিষয়ে সাধারণ সদস্যদের কাছে সরাসরি দায়বদ্ধ।',
      ],
    },
  },
  {
    en: 'Assistant Treasurer',
    bn: 'সহ-কোষাধ্যক্ষ',
    pts: {
      en: ['Assists with ledgers, collections, receipts, reconciliation.'],
      bn: ['হিসাব খাতা, জমা রসিদ প্রস্তুত, সংগ্রহ ও ব্যাংক স্টেটমেন্ট সমন্বয়ে কোষাধ্যক্ষকে সহায়তা।'],
    },
  },
  {
    en: 'Publicity Secretary',
    bn: 'প্রচার সম্পাদক',
    pts: {
      en: ['Oversees communications, media, branding, promotion.'],
      bn: ['সোসাইটির প্রচার, প্রচারণা, জনসংযোগ এবং সমাজকল্যাণমূলক ইতিবাচক পরিচিতি বৃদ্ধি।'],
    },
  },
  {
    en: 'Organizing Secretary',
    bn: 'সাংগঠনিক সম্পাদক',
    pts: {
      en: ['Drives growth; coordinates members.', 'Resolves internal disputes; ensures constitutional adherence.'],
      bn: ['সংগঠন সম্প্রসারণ ও সদস্যদের পারস্পরিক সম্পর্ক সুদৃঢ় রাখা।', 'অভ্যন্তরীণ মতপার্থক্য নিরসন এবং গঠনতন্ত্রের অনুশাসন বাস্তবায়ন নিশ্চিত করা।'],
    },
  },
];

export default function LeadershipPage() {
  const { lang, isBn } = useLanguage();
  const t = TRANSLATIONS[lang];

  return (
    <>
      <div className="page-hero">
        <div className="container">
          <span className="sec-tag">{t.leadership.heroTag}</span>
          <h1 className="sec-title">
            {t.leadership.heroTitle} <span className="g">{t.leadership.heroTitleAccent}</span>
          </h1>
        </div>
      </div>

      {/* Org chart */}
      <section>
        <div className="container">
          <SectionHead
            center
            tag={t.leadership.orgTag}
            title={<>{t.leadership.orgTitle} <span className="g">{t.leadership.orgTitleAccent}</span></>}
          />
          <Reveal delay={150}>
            <div className="org" style={{ marginTop: 50 }}>
              <div className="org-node">
                <b>{t.leadership.orgAdvisor}</b>
                <span>{t.leadership.orgAdvisorSub}</span>
              </div>
              <div className="org-line" />
              <div className="org-node">
                <b>{t.leadership.orgPresident}</b>
                <span>{t.leadership.orgPresidentSub}</span>
              </div>
              <div className="org-line" />
              <div className="org-node">
                <b>{t.leadership.orgGS}</b>
                <span>{t.leadership.orgGSSub}</span>
              </div>
              <div className="org-line" />
              <div className="org-row">
                <div className="org-node"><b>{t.leadership.orgVP}</b></div>
                <div className="org-node"><b>{t.leadership.orgJS}</b></div>
                <div className="org-node"><b>{t.leadership.orgTreasurer}</b></div>
                <div className="org-node"><b>{t.leadership.orgOrganizing}</b></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Executive committee */}
      <section className="principles">
        <div className="container">
          <SectionHead
            center
            tag={t.leadership.execTag}
            title={<>{t.leadership.execTitle} <span className="g">{t.leadership.execTitleAccent}</span></>}
          />
          <div className="grid-3" style={{ marginTop: 50 }}>
            {EXEC_COMMITTEE_I18N.map((m, i) => (
              <Reveal key={m.sl} delay={(i % 3) * 100}>
                <div className="lead-card">
                  <div className="avatar">
                    {isBn ? initialsBn(m.name.bn) : initialsEn(m.name.en)}
                  </div>
                  <div>
                    <b>{isBn ? m.name.bn : m.name.en}</b>
                    <span className="pos">{isBn ? m.bnRole : m.enRole}</span>
                    <span className="bn">{isBn ? `পদবী ক্রম: ${m.sl === '01' ? '০১' : m.sl === '02' ? '০২' : m.sl === '03' ? '০৩' : m.sl === '04' ? '০৪' : m.sl === '05' ? '০৫' : m.sl === '06' ? '০৬' : m.sl === '07' ? '০৭' : m.sl === '08' ? '০৮' : '০৯'}` : m.bnRole}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150}>
            <div style={{ marginTop: 34 }}>
              <h3 style={{ marginBottom: 12 }}>{t.leadership.approvingExec}</h3>
              <div className="pill-row">
                {APPROVING_EXEC_I18N.map((n) => (
                  <span key={n.en} className="pill">
                    {isBn ? n.bn : n.en}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Advisory */}
      <section>
        <div className="container">
          <SectionHead
            center
            tag={t.leadership.advisoryTag}
            title={<>{t.leadership.advisoryTitle} <span className="g">{t.leadership.advisoryTitleAccent}</span></>}
          />
          <div className="grid-4" style={{ marginTop: 50 }}>
            {ADVISORY_COUNCIL_I18N.map((n, i) => (
              <Reveal key={n.en} delay={(i % 4) * 100}>
                <div className="lead-card">
                  <div className="avatar">
                    {isBn ? initialsBn(n.bn) : initialsEn(n.en)}
                  </div>
                  <div>
                    <b>{isBn ? n.bn : n.en}</b>
                    <span className="pos">{isBn ? 'সম্মানিত উপদেষ্টা সদস্য' : 'Member Advisor'}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <div style={{ marginTop: 30 }}>
              <h3 style={{ marginBottom: 12 }}>{t.leadership.approvingAdvisory}</h3>
              <div className="pill-row">
                {APPROVING_ADVISORY_I18N.map((n) => (
                  <span key={n.en} className="pill">
                    {isBn ? n.bn : n.en}
                  </span>
                ))}
              </div>
              <h3 style={{ margin: '26px 0 12px' }}>{t.leadership.bankOperators}</h3>
              <div className="pill-row">
                {SIGNATORIES_I18N.map((n) => (
                  <span key={n.en} className="pill" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: '#92400e' }}>
                    ✍️ {isBn ? n.bn : n.en}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Roles & duties */}
      <section className="principles">
        <div className="container" style={{ maxWidth: 860 }}>
          <SectionHead
            center
            tag={t.leadership.rolesTag}
            title={<>{t.leadership.rolesTitle} <span className="g">{t.leadership.rolesTitleAccent}</span></>}
          />
          <div style={{ display: 'grid', gap: 14, marginTop: 50 }}>
            {ROLES_I18N.map((r, i) => (
              <Reveal key={r.en} delay={i * 60}>
                <details className="role">
                  <summary>
                    {isBn ? r.bn : r.en}
                    <span className="bn">{isBn ? 'দায়িত্ব ও কর্মপরিধি' : r.bn}</span>
                  </summary>
                  <div className="body">
                    <ul>
                      {r.pts[lang].map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
