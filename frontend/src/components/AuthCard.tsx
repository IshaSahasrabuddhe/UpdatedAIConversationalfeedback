import type { FormEvent } from "react";
import { Link } from "react-router-dom";

interface AuthCardProps {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  submitLabel: string;
  badgeLabel?: string;
  alternateLabel: string;
  alternateLink: string;
  alternateText: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  error: string | null;
  loading: boolean;
  topTabs: Array<{
    label: string;
    href?: string;
    active?: boolean;
    onClick?: () => void;
  }>;
  auxiliaryAction?: {
    label: string;
    onClick?: () => void;
  };
  adminAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function AuthCard(props: AuthCardProps) {
  return (
    <div className="w-full max-w-[620px]">
      <div className="rounded-[36px] border border-white/5 bg-[linear-gradient(180deg,rgba(33,52,82,0.96),rgba(28,45,72,0.92))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="rounded-[26px] bg-[#07162E] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            {props.topTabs.map((tab) => {
              const content = (
                <span
                  className={`flex items-center justify-center rounded-[22px] px-4 py-3 text-base font-semibold leading-normal tracking-[0.01em] transition duration-200 ${
                    tab.active
                      ? "bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-500 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.3)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {tab.label}
                </span>
              );

              if (tab.href) {
                return (
                  <Link key={tab.label} to={tab.href} className="block">
                    {content}
                  </Link>
                );
              }

              return (
                <button key={tab.label} type="button" onClick={tab.onClick} className="block">
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-4 pt-8 sm:px-6 sm:pb-6">
          <div className="mb-7">
            <p className="mb-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase leading-normal tracking-[0.28em] text-cyan-100/90">
              {props.badgeLabel || "Luminescent Insight"}
            </p>
            <h1 className="text-lg font-semibold leading-normal text-slate-50">{props.title}</h1>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">{props.subtitle}</p>
          </div>

          <form className="space-y-6" onSubmit={props.onSubmit}>
            <label className="block">
              <span className="text-sm font-medium leading-normal text-slate-300">Email Address</span>
              <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-white/5 bg-[#23324D]/70 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <span className="text-slate-400">
                  <MailIcon />
                </span>
                <input
                  className="w-full bg-transparent text-base leading-normal text-slate-100 outline-none placeholder:text-slate-400/80"
                  type="email"
                  value={props.email}
                  onChange={(event) => props.setEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </label>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium leading-normal text-slate-300">Password</span>
                {props.mode === "login" && props.auxiliaryAction ? (
                  <button
                    type="button"
                    onClick={props.auxiliaryAction.onClick}
                    className="text-xs font-semibold leading-normal text-cyan-300 transition hover:text-cyan-200"
                  >
                    {props.auxiliaryAction.label}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-3 rounded-[22px] border border-white/5 bg-[#23324D]/70 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <span className="text-slate-400">
                  <LockIcon />
                </span>
                <input
                  className="w-full bg-transparent text-base leading-normal text-slate-100 outline-none placeholder:text-slate-400/80"
                  type="password"
                  value={props.password}
                  onChange={(event) => props.setPassword(event.target.value)}
                  placeholder={props.mode === "login" ? "Enter your password" : "Create a secure password"}
                  required
                />
              </div>
            </div>

            {props.error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-relaxed text-rose-200">{props.error}</p> : null}

            <button
              className="w-full rounded-[22px] bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-500 px-4 py-4 text-base font-semibold leading-normal text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={props.loading}
            >
              {props.loading ? "Please wait..." : props.submitLabel} <span aria-hidden="true">→</span>
            </button>
          </form>

          {props.adminAction ? (
            <div className="mt-8">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <p className="text-xs font-semibold uppercase leading-normal tracking-[0.2em] text-slate-400">Secure Access</p>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button
                type="button"
                onClick={props.adminAction.onClick}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-[20px] border border-white/10 bg-transparent px-4 py-4 text-base font-semibold leading-normal text-indigo-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/5"
              >
                <ShieldIcon />
                {props.adminAction.label}
              </button>
            </div>
          ) : null}

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-300">
            {props.alternateText}{" "}
            <Link className="font-semibold text-cyan-300 transition hover:text-cyan-200" to={props.alternateLink}>
              {props.alternateLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.67157 4.67157 6 5.5 6H18.5C19.3284 6 20 6.67157 20 7.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M5 7L12 12L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 10V7.5C8 5.567 9.567 4 11.5 4C13.433 4 15 5.567 15 7.5V10" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5" y="10" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.5 13.5V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L18 5.5V11.2C18 15.1 15.48 18.73 12 20C8.52 18.73 6 15.1 6 11.2V5.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}
