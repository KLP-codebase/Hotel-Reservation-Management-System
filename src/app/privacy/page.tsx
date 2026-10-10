import { Metadata } from 'next';
import PrivacyPageClient from './PrivacyPageClient';

export const metadata: Metadata = {
  title: 'Privacy Policy & Guest Data Charter | SkyNest Hotels',
  description: 'SkyNest Hotel Reservation & Guest Services Management System privacy policy, guest data protection charter, and statutory compliance under Sri Lanka Personal Data Protection Act No. 9 of 2022.',
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
