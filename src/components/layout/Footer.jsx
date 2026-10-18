import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Bus, 
  BookOpen, 
  ShieldCheck, 
  LayoutDashboard, 
  Cpu, 
  Scale, 
  Sparkles, 
  ExternalLink,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-200 border-t-4 border-[#D84E55] pt-12 pb-8 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Footer Banner: Dedicated Admin & Research Authority Portal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                TRANSIT AUTHORITY & RESEARCH CONSOLE
              </span>
              <span className="text-xs text-slate-400 font-bold">• Internal Operations</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Predictive Fleet Management & Algorithmic Fairness Console
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              For transit operators & researchers: Scikit-Learn demand regressions, SHAP feature attributions, and policy calibration.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              to="/admin"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#D84E55] hover:bg-[#C23E44] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-red-400"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </Link>
          </div>
        </div>

        {/* Multi-Column System Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: System Info & Accessibility Commitment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#D84E55] text-white rounded-xl flex items-center justify-center font-black" aria-hidden="true">
                <Bus className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight leading-none">
                Smart<span className="text-[#D84E55]">Bus</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Public Inter-City Transit Intelligence Platform. Built on universal accessibility (WCAG 2.1 AA) and explainable AI transparency.
            </p>
            <div className="flex items-center gap-2.5 text-xs text-teal-300 bg-slate-900 p-3 rounded-xl border border-slate-800 font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-400" aria-hidden="true" />
              <span>WCAG 2.1 AA Compliant • Zero PII Retained</span>
            </div>
          </div>

          {/* Column 2: Rider Tools */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-black uppercase tracking-wider">
              Rider Services
            </h4>
            <ul className="space-y-1.5 text-xs font-bold text-slate-300">
              <li>
                <Link to="/" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Journey Planner
                </Link>
              </li>
              <li>
                <Link to="/find-bus" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Route Timetables & Schedules
                </Link>
              </li>
              <li>
                <Link to="/history" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  My History & Student Allocations
                </Link>
              </li>
              <li>
                <Link to="/help" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Help Center & Accessibility Feedback
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: ML & Algorithmic Fairness Modules */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-black uppercase tracking-wider">
              Research & Admin Modules
            </h4>
            <ul className="space-y-1.5 text-xs font-bold text-slate-300">
              <li>
                <Link to="/admin/demand" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Demand Forecasting (Scikit-Learn)
                </Link>
              </li>
              <li>
                <Link to="/admin/overcrowding" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Overcrowding Risk Thresholds
                </Link>
              </li>
              <li>
                <Link to="/admin/xai" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  SHAP Explainable AI Attribution
                </Link>
              </li>
              <li>
                <Link to="/admin/allocation" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Fair Capacity Allocation Engine
                </Link>
              </li>
              <li>
                <Link to="/admin/counterfactual" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Counterfactual Parity Simulator
                </Link>
              </li>
              <li>
                <Link to="/admin/calibration" className="min-h-[36px] flex items-center hover:text-white hover:underline rounded">
                  Policy Calibration Matrix
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Academic Basis */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-black uppercase tracking-wider">
              Methodological Basis
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              Based on empirical research in transit overcrowding prediction with XAI (C14) and counterfactual explainable algorithmic fairness (C11).
            </p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-mono">
              Dataset: 249 authenticated Pune trips, 231 forecast scenarios, capacity limit: 52 pass/veh.
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Status */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center text-xs font-bold text-slate-400 gap-4">
          <p>© 2026 SmartBus Pune Rapid Transit Research Prototype. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All Systems Operational</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">WCAG 2.1 Level AA</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
