import { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us | SkyNest Luxury Hotels & Sanctuaries',
  description: 'Enquire directly with the SkyNest hospitality team, concierge, and sanctuaries across Colombo, Kandy, and Galle.',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
