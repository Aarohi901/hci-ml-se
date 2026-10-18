import React from 'react';
import { Link } from 'react-router-dom';
import { Bus, ShieldCheck, Headphones, HeartHandshake, Lock } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

export const PassengerFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t-4 border-[#075985] pt-12 pb-8 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Multi-Column Passenger Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#075985] text-white rounded-xl flex items-center justify-center font-bold" aria-hidden="true">
                <Bus className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold font-heading text-white tracking-[-0.02em] leading-none">
                Bus<span className="text-[#38BDF8]">Mate</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-normal" data-i18n="footer.brand_desc">
              {t('footer.brand_desc')}
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-300 bg-slate-800 p-2.5 rounded-xl border border-slate-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span data-i18n="footer.wcag_badge">{t('footer.wcag_badge')}</span>
            </div>
          </div>

          {/* Column 2: Passenger Services */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.05em]" data-i18n="footer.passenger_services">
              {t('footer.passenger_services')}
            </h4>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li>
                <Link to="/" className="hover:text-white hover:underline" data-i18n="footer.online_booking">
                  {t('footer.online_booking')}
                </Link>
              </li>
              <li>
                <Link to="/find-bus" className="hover:text-white hover:underline" data-i18n="footer.schedules">
                  {t('footer.schedules')}
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-white hover:underline">
                  {t('myHistory') || 'My History'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Transit Terminals & Corridors */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.05em]" data-i18n="footer.key_terminals">
              {t('footer.key_terminals')}
            </h4>
            <ul className="space-y-1.5 text-xs font-medium text-slate-400">
              <li>Swargate Intercity Bus Stand</li>
              <li>Pune Central Railway Station</li>
              <li>Katraj South Bus Stand</li>
              <li>Shivajinagar Metro Terminal</li>
              <li>Hinjawadi IT Park Express Stops</li>
              <li>IIIT Pune Campus Shuttle Quad</li>
            </ul>
          </div>

          {/* Column 4: Commuter Support */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.05em]" data-i18n="footer.customer_support">
              {t('footer.customer_support')}
            </h4>
            <p className="text-xs text-slate-400 font-normal leading-relaxed" data-i18n="footer.support_desc">
              {t('footer.support_desc')}
            </p>
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider" data-i18n="footer.helpline_label">{t('footer.helpline_label')}</span>
              <span className="text-sm font-bold text-white tabular-nums">+91 20 2567 8900</span>
            </div>
            <Link 
              to="/help" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#38BDF8] hover:underline"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span data-i18n="footer.visit_help">{t('footer.visit_help')}</span>
            </Link>
          </div>

        </div>

        {/* Bottom Line: Copyright & Discrete Staff Portal Link */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center text-xs font-medium text-slate-500 gap-4">
          <p data-i18n="footer.copyright">{t('footer.copyright')}</p>

          <div className="flex items-center gap-6">
            <Link to="/help" className="hover:text-slate-300" data-i18n="footer.privacy">
              {t('footer.privacy')}
            </Link>
            <Link to="/help" className="hover:text-slate-300" data-i18n="footer.terms">
              {t('footer.terms')}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
