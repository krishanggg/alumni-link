import { SchoolSeal } from '../shared/icons/SchoolSeal';

export function AuthBrandingPanel() {
  const copyright = `\u00A9 ${new Date().getFullYear()} AlumniLink. All rights reserved.`;

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-on-primary md:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.35) 0, transparent 45%)',
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30">
          <SchoolSeal size={40} className="text-on-primary" />
        </div>
        <h1 className="text-display-lg font-display-lg text-on-primary">AlumniLink</h1>
        <p className="mt-2 text-body-lg text-on-primary-container">Alumni Tracking System</p>
        <div className="mt-6 h-px w-16 bg-white/30" />
        <p className="mt-6 max-w-xs text-body-md text-on-primary-container opacity-80">
          Connecting graduates to their school community, one record at a time.
        </p>
      </div>
      <p className="relative text-center text-label-sm text-on-primary-container opacity-70">
        {copyright}
      </p>
    </div>
  );
}
