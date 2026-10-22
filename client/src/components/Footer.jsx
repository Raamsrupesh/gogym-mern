import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BrandLogo from './BrandLogo';

const DEMO_WHATSAPP_NUMBER = '+91 93989 79871';
const DEVELOPER = {
  name: 'Rupesh Yerra',
  linkedin: 'https://www.linkedin.com/in/rupeshyerra/',
  whatsapp: '8328595988',
};
const SOCIAL_LINKS = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/', icon: 'linkedin' },
  { name: 'WhatsApp', href: `https://wa.me/${DEMO_WHATSAPP_NUMBER}`, icon: 'whatsapp' },
  { name: 'Instagram', href: 'https://www.instagram.com/gogym_official_vzm?utm_source=qr&mdxt=aWFqa2F4NGRsZ2cz', icon: 'instagram' },
  { name: 'Facebook', href: 'https://www.facebook.com/', icon: 'facebook' },
];

function SocialIcon({ name }) {
  const sharedProps = {
    'aria-hidden': true,
    className: 'h-5 w-5',
    fill: 'currentColor',
    viewBox: '0 0 24 24',
  };

  if (name === 'linkedin') {
    return <svg {...sharedProps}><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM8 19H5V9h3v10ZM6.5 7.73A1.73 1.73 0 1 1 6.5 4.27a1.73 1.73 0 0 1 0 3.46ZM19 19h-3v-4.87c0-1.16-.02-2.65-1.62-2.65-1.62 0-1.87 1.27-1.87 2.57V19h-3V9h2.88v1.37h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19Z" /></svg>;
  }
  if (name === 'whatsapp') {
    return <svg {...sharedProps}><path d="M12.04 2a9.87 9.87 0 0 0-8.46 14.96L2 22l5.2-1.52A9.96 9.96 0 0 0 12.04 22 10 10 0 0 0 22 12 9.96 9.96 0 0 0 12.04 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.09.9.92-3.01-.2-.31a8.17 8.17 0 1 1 6.85 3.75Zm4.49-6.12c-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.16-.3.19-.55.06-.25-.12-1.06-.39-2.02-1.23-.75-.66-1.25-1.48-1.4-1.73-.15-.25-.02-.39.11-.52.11-.11.25-.3.38-.45.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.4.53.59.19 1.12.16 1.54.1.47-.07 1.48-.61 1.69-1.2.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.28Z" /></svg>;
  }
  if (name === 'instagram') {
    return <svg {...sharedProps}><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" /></svg>;
  }
  return <svg {...sharedProps}><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.88v2.28h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z" /></svg>;
}

export default function Footer() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    api.get('/settings/public').then((data) => setSettings(data.settings || {})).catch(() => {});
  }, []);

  const phoneDigits = (settings.whatsapp || DEMO_WHATSAPP_NUMBER).replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent('Hello Sir, I just have some queries regarding Gogym!')}`;
  const developerWhatsappDigits = DEVELOPER.whatsapp.replace(/\D/g, '');

  return (
    <footer className="border-t border-electricblue bg-card text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" aria-label="GoGym home" className="inline-flex">
            <BrandLogo />
          </Link>
          <p className="mt-3 mb-3 max-w-sm text-sm leading-6 text-white">
            {settings.businessName || 'GoGym'} · Make your next move a strong one.
          </p>
          <h2 className="flex items-center gap-2 font-bold">
          {/* <span className="h-2 w-2 rounded-full bg-electricblue" /> */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-geo-alt-fill"
            viewBox="0 0 16 16"
          >
            <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
          </svg>
          Location:
        </h2>

        <p className="mt-1 max-w-sm text-sm leading-6 text-white">
          GOGYM, GELLA BUILDING 2nd Floor, consumer court, besides, Shivaji Colony, Pradeep Nagar, Vizianagaram, Andhra Pradesh 535004.
        </p>
{settings.phone && <a className="mt-2 inline-block text-sm text-white hover:text-white" href={`tel:${settings.phone}`}>{settings.phone}</a>}

          <a href='https://www.linkedin.com/in/rupeshyerra/' target="_blank" className="inline-flex shrink-0 items-center justify-center rounded-full bg-gymred px-7 py-3.5 font-bold text-white transition hover:shadow-[0_0_20px_#00D2FF] mt-3"> MEET THE DEVELOPER <span className="ml-2" aria-hidden="true"> → </span></a>
        </div>

        <div>
          <h2 className="font-bold">Explore</h2>
          <div className="mt-4 flex flex-col items-start gap-3 text-sm text-white">
            <Link to="/plans" className="transition-colors hover:text-electricblue">Membership plans</Link>
            <Link to="/register" className="transition-colors hover:text-electricblue">Create an account</Link>
            <Link to="/login" className="transition-colors hover:text-electricblue">Member sign in</Link>
            {settings.email && <a href={`mailto:${settings.email}`} className="transition-colors hover:text-electricblue">{settings.email}</a>}
          </div>
        </div>

        <div>
          <h2 className="font-bold">Let’s connect</h2>
          <p className="mt-2 text-sm leading-6 text-white">Questions about joining? Chat with the gym team on WhatsApp.</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gymred px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-[0_0_18px_#00D2FF]"
          >
            <SocialIcon name="whatsapp" />
            Chat with us
          </a>
          {!settings.whatsapp && <p className="mt-2 text-xs text-white">Demo number — update the WhatsApp number in Admin → Settings.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {SOCIAL_LINKS.map((social) => {
              const href = social.icon === 'whatsapp' ? whatsappUrl : social.href;
              return (
                <a
                  key={social.name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.icon === 'whatsapp' ? 'Chat with GoGym on WhatsApp' : `GoGym on ${social.name}`}
                  title={social.name}
                  className="rounded-full border border-electricblue p-2.5 text-white transition hover:bg-electricblue hover:text-charcoal"
                >
                  <SocialIcon name={social.icon} />
                </a>
              );
            })}
          </div>
          {/* <p className="mt-2 text-xs text-white">Replace the social links with your gym’s official profiles.</p> */}
        </div>
      </div>
      <div className="border-t border-electricblue">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-xs text-white sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.businessName || 'GoGym'}. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-white/70">Built by</span>
            <a
              href={DEVELOPER.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label={`Meet the developer, ${DEVELOPER.name}, on LinkedIn`}
              className="font-semibold text-white underline-offset-2 transition-colors hover:text-electricblue hover:underline"
            >
              Meet the developer
            </a>
            <span aria-hidden className="text-white/40">·</span>
            <a
              href={`https://wa.me/91${developerWhatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp the developer at ${DEVELOPER.whatsapp}`}
              className="inline-flex items-center gap-1 font-semibold text-white underline-offset-2 transition-colors hover:text-electricblue hover:underline"
            >
              <SocialIcon name="whatsapp" />
              {DEVELOPER.whatsapp}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}