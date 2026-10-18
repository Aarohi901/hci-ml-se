import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bus, 
  Calendar, 
  MapPin, 
  HelpCircle, 
  Globe, 
  User, 
  Accessibility, 
  Menu, 
  X, 
  Check, 
  ChevronDown,
  Ticket,
  Navigation,
  Cpu
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';

export const PassengerNavbar = () => {
  const location = useLocation();
  const { setIsModalOpen, setIsA11yDrawerOpen } = useAccessibility();
  const { language, setLanguage, t, languages, currentLang } = useTranslation();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Rider-focused public navigation tabs (Adopting clean functional model with reactive i18n)
  const navTabs = [
    { path: '/', label: t('busTickets'), key: 'busTickets', icon: Bus },
    { path: '/find-bus', label: t('nav.schedules'), key: 'nav.schedules', icon: Calendar },
    { path: '/live-tracking', label: t('nav.live_tracking'), key: 'nav.live_tracking', icon: Navigation },
    { path: '/history', label: t('myHistory') || 'My History', key: 'myHistory', icon: Ticket },
    { path: '/help', label: t('help'), key: 'help', icon: HelpCircle },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/history') return location.pathname === '/history' || location.pathname === '/my-trips';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header 
        className="bg-white border-b-2 border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs" 
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Left: Custom SmartBus Logo (Navy & Teal Brand Palette) */}
            <div className="flex items-center gap-6 lg:gap-10">
              <Link 
                to="/" 
                className="flex items-center gap-3 min-h-[48px] px-2 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#075985] transition-transform active:scale-95"
                aria-label="BusMate Public Transit Home"
              >
                <div className="w-10 h-10 bg-[#075985] text-white rounded-xl flex items-center justify-center shadow-xs font-bold shrink-0">
                  <Bus className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold font-heading text-slate-900 tracking-[-0.02em] leading-none">
                    Bus<span className="text-[#075985]">Mate</span>
                  </span>
                  <span className="text-[10px] font-semibold text-sky-700 tracking-[0.05em] uppercase mt-0.5 font-mono">
                    IIIT Pune Campus Shuttle
                  </span>
                </div>
              </Link>

              {/* Functional Horizontal Navigation Tabs */}
              <nav className="hidden lg:flex items-center gap-1" aria-label="Passenger Services Navigation">
                {navTabs.map((tab) => {
                  const active = isActive(tab.path);
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      className={`relative min-h-[44px] flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-[#075985] ${
                        active 
                          ? 'text-[#075985] bg-sky-50 font-semibold' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#075985]' : 'text-slate-500'}`} aria-hidden="true" />
                      <span>{tab.label}</span>
                      {active && (
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#075985] rounded-full" aria-hidden="true"></span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Action Items: Language, Account, A11y Trigger */}
            <div className="hidden md:flex items-center gap-3">
              
              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="language-selector-button"
                  onClick={() => {
                    setLangMenuOpen(!langMenuOpen);
                    setAccountMenuOpen(false);
                  }}
                  className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#075985]"
                  aria-expanded={langMenuOpen}
                  aria-haspopup="true"
                  aria-label="Select system language"
                >
                  <Globe className="w-4 h-4 text-[#075985]" aria-hidden="true" />
                  <span>{currentLang.native}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </button>

                {langMenuOpen && (
                  <div 
                    id="language-dropdown-menu"
                    className="absolute right-0 mt-2 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                    aria-label="Language options"
                  >
                    <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Select Language
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        id={`lang-option-${l.code}`}
                        type="button"
                        onClick={() => {
                          setLanguage(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-sky-50 flex items-center justify-between transition-colors ${
                          language === l.code ? 'text-[#075985] bg-sky-50/50 font-semibold' : 'text-slate-700'
                        }`}
                        role="menuitem"
                      >
                        <div>
                          <span className="block font-medium">{l.native}</span>
                          <span className="text-[10px] text-slate-400">{l.label}</span>
                        </div>
                        {language === l.code && <Check className="w-4 h-4 text-[#075985]" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Account / User Profile Section */}
              <div className="relative">
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(!accountMenuOpen);
                        setLangMenuOpen(false);
                      }}
                      className="min-h-[40px] flex items-center gap-2 px-3 py-1.5 text-slate-800 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#075985]"
                      aria-expanded={accountMenuOpen}
                      aria-haspopup="true"
                      aria-label="Rider account menu"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#075985] to-[#0284c7] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                        {user?.name ? user.name.charAt(0) : 'U'}
                      </div>
                      <span className="font-semibold text-slate-900 max-w-[110px] truncate">
                        {user?.name ? user.name.split(' ')[0] : 'Commuter'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    </button>

                    {accountMenuOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                        role="menu"
                        aria-label="User account options"
                      >
                        <div className="px-4 py-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-900 block truncate">{user?.name}</span>
                          <span className="text-[11px] text-slate-500 font-normal block truncate">{user?.email || user?.phone}</span>
                          <span className="mt-1 inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Verified Commuter
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/history"
                            onClick={() => setAccountMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-[#075985] flex items-center gap-2.5"
                            role="menuitem"
                          >
                            <Ticket className="w-4 h-4 text-slate-400" />
                            <span>{t('myHistory') || 'My History'}</span>
                          </Link>
                          <Link
                            to="/admin"
                            id="admin-dashboard-dropdown-link"
                            onClick={() => setAccountMenuOpen(false)}
                            className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-[#075985] flex items-center gap-2.5"
                            role="menuitem"
                          >
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                            <span>Admin Portal (Rule-Based)</span>
                          </Link>
                        </div>

                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAccountMenuOpen(false);
                              logout();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                            role="menuitem"
                          >
                            <span data-i18n="nav.logout">{t('nav.logout')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal({ mode: 'login' })}
                    className="min-h-[40px] flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:text-[#075985] bg-white hover:bg-sky-50 border border-slate-200 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#075985] cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span data-i18n="loginSignup">{t('loginSignup')}</span>
                  </button>
                )}
              </div>

              {/* Accessibility Engine Trigger Button ("Accessibility" ♿) */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 text-[#075985] hover:text-white hover:bg-[#075985] bg-sky-50 rounded-xl text-xs font-semibold border border-sky-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#075985]"
                title="Accessibility Options (Ctrl + F2)"
                aria-label="Accessibility Options"
              >
                <span className="text-sm" aria-hidden="true">♿</span>
                <span data-i18n="accessibility">{t('accessibility')}</span>
              </button>

            </div>

            {/* Mobile Drawer Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-2 text-[#075985] hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1"
                title="Accessibility Options (Ctrl + F2)"
                aria-label="Accessibility Options"
              >
                <span className="text-base" aria-hidden="true">♿</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#075985]"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-3">
            {/* Mobile Language Switcher */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#075985]" />
                <span>Language / भाषा</span>
              </span>
              <div className="flex gap-1.5">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    id={`mobile-lang-${l.code}`}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      language === l.code ? 'bg-[#075985] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navTabs.map((tab) => {
                const active = isActive(tab.path);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-left ${
                      active ? 'bg-sky-50 text-[#075985] border border-sky-200' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full py-2.5 bg-sky-50 text-[#075985] text-xs font-semibold rounded-xl border border-sky-200 text-center flex items-center justify-center gap-1.5"
              >
                <span>♿</span>
                <span data-i18n="accessibility">{t('accessibility')} (Ctrl + F2)</span>
              </button>
              {isAuthenticated ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#075985] text-white flex items-center justify-center font-bold text-xs">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{user?.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal block">{user?.email || user?.phone}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="text-xs font-semibold text-rose-600 px-2 py-1 hover:bg-rose-50 rounded-lg"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal({ mode: 'login' });
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-[#075985] to-[#0284c7] text-white text-xs font-semibold rounded-xl text-center shadow-xs"
                >
                  <span data-i18n="loginSignup">{t('loginSignup')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
