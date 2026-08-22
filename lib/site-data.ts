export const MARQUEE_ITEMS = [
  'Unity is Strength', 'Many a Little Makes a Mickle', 'Shariah-Compliant Investment',
  'Mutual Aid & Welfare', 'No Internal Lending', 'Transparent Banking', 'Collective Over Individual',
];

export const CLAUSES = [
  { n: 1, t: 'Dedication & Faith', x: 'Every honored member shall preserve complete faith in their respective religion while voluntarily committing to human welfare and the continuous development of the society.' },
  { n: 2, t: 'Constitutional Governance & Shariah-Compliant Investment', x: 'All operations strictly follow this Constitution. Funds are invested only upon Investment Board decision into interest-free (halal) profitable sectors — focusing on building & housing construction.' },
  { n: 3, t: 'Sanctity & Amendment Protocol', x: 'The Constitution is binding for all members. Amendments require a majority vote at an extraordinary or General Meeting. Intentional violation is an unlawful offense subject to disciplinary/legal action.' },
  { n: 4, t: 'Tenure & Revenue Sources', x: 'Operational term of 5 (five) years. Income: regular monthly subscriptions, ad-hoc donations, and lump-sum contributions.' },
  { n: 5, t: 'Profit & Loss Sharing', x: 'Every member is an equal stakeholder in net profits and losses based on investment ratio and proportionate duration of investment.' },
  { n: 6, t: 'Executive Term & Elections', x: 'Executive Committee tenure: 2 years. The President, with the Chief Advisor, dissolves the council and forms an Election Commission to hand over charge fairly.' },
  { n: 7, t: 'Three-Tier Governance', x: 'Governed by an Executive Council (Karyanirbahi Parishad), an Advisory Council (Upodeshta Parishad), and a joint Investment Board (Biniyog Board).' },
  { n: 8, t: 'Founding Members’ Authority', x: 'Founding members hold primary representation and operational management authority within the society.' },
  { n: 9, t: 'Induction of New Members', x: 'New members join through official procedures, receive proportionate profits/losses, and enjoy full voting rights.' },
  { n: 10, t: 'Departing & Re-entering Members', x: 'A resigned member may rejoin via standard application but permanently forfeits the “Founding Member” designation.' },
  { n: 11, t: 'Active Investment Non-Termination', x: 'Members with actively deployed investments/assets cannot unilaterally terminate membership until commitments are cleared.' },
  { n: 12, t: 'Elections & Joint Investment Board', x: 'Both councils are directly elected. The Investment Board is formed jointly and headed by the Chief Advisor; both councils are jointly accountable.' },
  { n: 13, t: 'Discipline & Impeachment', x: 'Substantiated anti-organizational conduct requires voluntary resignation; written complaint to the society; vacancy filled via election.' },
  { n: 14, t: 'Frequency of Meetings', x: 'The Executive Council holds a mandatory formal meeting every 30 (thirty) days.' },
  { n: 15, t: 'Bank Account Signatories', x: 'The Advisory Council designates 3 Executive members to jointly open and operate the official bank account.' },
  { n: 16, t: 'Banking Discipline', x: 'All subscriptions deposit into the official account; deposit receipt numbers are recorded in the register at every monthly meeting.' },
  { n: 17, t: 'Withdrawal & Chequebook Custody', x: 'Withdrawals require a joint council resolution stating purpose & cheque number. The chequebook stays with a non-signatory member or the Chief Advisor.' },
  { n: 18, t: '“Amanat” Principle — No Internal Lending', x: 'All deposits are a sacred trust. Under no circumstances shall any loan be issued to any member from deposited funds.' },
  { n: 19, t: 'Bereavement Welfare Policy', x: 'Upon an active member’s death, fellows may voluntarily support the family with BDT 200/month per member — never forced.' },
];

export const EXEC_COMMITTEE = [
  { sl: '01', en: 'President', bn: 'সভাপতি', name: 'Md. Babul Miah' },
  { sl: '02', en: 'Vice President', bn: 'সহ-সভাপতি', name: 'Md. Jewel Khan' },
  { sl: '03', en: 'General Secretary', bn: 'সাধারণ সম্পাদক', name: 'Md. Nasir Uddin' },
  { sl: '04', en: 'Joint General Secretary', bn: 'সহ-সাধারণ সম্পাদক', name: 'Md. Monirul Islam' },
  { sl: '05', en: 'Treasurer', bn: 'কোষাধ্যক্ষ', name: 'Md. Faizul Islam Hasan' },
  { sl: '06', en: 'Assistant Treasurer', bn: 'সহ-কোষাধ্যক্ষ', name: 'Md. Yusuf' },
  { sl: '07', en: 'Publicity Secretary', bn: 'প্রচার সম্পাদক', name: 'Md. Russel' },
  { sl: '08', en: 'Asst. Publicity Secretary', bn: 'সহ-প্রচার সম্পাদক', name: 'Md. Junayed' },
  { sl: '09', en: 'Organizing Secretary', bn: 'সাংগঠনিক সম্পাদক', name: 'Md. Zakir Hossain' },
];

export const ADVISORY_COUNCIL = [
  'Md. Jewel Khan', 'Md. Nasir Uddin', 'Md. Yusuf', 'Abdul Kader',
  'Md. Babul Miah', 'Md. Russel', 'Md. Faizul Islam Hasan',
];
export const APPROVING_EXEC = ['Farjana Farhat - Rina', 'Samir / Ranir', 'Md. Ali', 'Md. Sohag', 'Md. Abdul Kader'];
export const APPROVING_ADVISORY = ['Biplob Bepari', 'Rony', 'Roksana', 'Dalia'];
export const SIGNATORIES = ['Md. Jewel Khan', 'Md. Yusuf', 'Md. Babul Miah'];

export const ROLES = [
  { en: 'Chief Advisor', bn: 'প্রধান উপদেষ্টা', pts: ['Leads the Advisory Council; most respected position.', 'Oversees overall affairs; guides Executive policy.', 'May dissolve the Executive Council in severe disputes (with the President) and initiate fresh elections.'] },
  { en: 'President', bn: 'সভাপতি', pts: ['Principal head & chief representative.', 'Presides over all meetings; instructs the General Secretary.', 'Casting vote in exact ties; may dissolve council with Chief Advisor during disputes.'] },
  { en: 'Vice President', bn: 'সহ-সভাপতি', pts: ['Coordinates with the President.', 'Assumes presidential duties in their absence.'] },
  { en: 'General Secretary', bn: 'সাধারণ সম্পাদক', pts: ['Chief organizational & executive coordinator.', 'Issues notices with President’s consent; keeps minutes.', 'Prepares action plans, annual budgets, financial statements.'] },
  { en: 'Joint / Assistant Secretary', bn: 'সহ-সম্পাদক', pts: ['Assists the General Secretary in all duties.', 'Executes assignments in consultation with the General Secretary.'] },
  { en: 'Treasurer', bn: 'কোষাধ্যক্ষ', pts: ['Chief Financial & Accounts Officer.', 'Receives subscriptions/donations; manages bank transactions.', 'Directly accountable to membership for accounts & audits.'] },
  { en: 'Assistant Treasurer', bn: 'সহ-কোষাধ্যক্ষ', pts: ['Assists with ledgers, collections, receipts, reconciliation.'] },
  { en: 'Publicity Secretary', bn: 'প্রচার সম্পাদক', pts: ['Oversees communications, media, branding, promotion.'] },
  { en: 'Organizing Secretary', bn: 'সাংগঠনিক সম্পাদক', pts: ['Drives growth; coordinates members.', 'Resolves internal disputes; ensures constitutional adherence.'] },
];
