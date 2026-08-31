import { redirect } from 'next/navigation';

export default function MemberReceiptsRedirectPage() {
  redirect('/member/transactions');
}
