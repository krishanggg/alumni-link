import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Monitor, Terminal, FileCode, Layers, Server, Database, HardDrive,
  Table2, Zap, KeyRound, History, School, Users, GraduationCap, Clock, Activity,
} from 'lucide-react';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SystemService } from '../../services/SystemService';
import type { SystemInfo } from '../../types/Profile';

export default function SystemInfoPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await SystemService.fetchSystemInfo();
        setInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load system information');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  if (isLoading) {
    return (
      <SettingsLayout>
        <div>
          <h2 className="text-headline-sm font-headline-sm text-on-surface">System Information</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
                <div className="h-4 w-20 rounded bg-surface-container" />
                <div className="mt-2 h-6 w-32 rounded bg-surface-container" />
              </div>
            ))}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  if (!info) {
    return (
      <SettingsLayout>
        <div className="rounded-DEFAULT bg-error-container p-4 text-on-error-container" role="alert">
          {error || 'Failed to load system information.'}
        </div>
      </SettingsLayout>
    );
  }

  const cards: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: 'System Name', value: info.application.name, icon: Monitor },
    { label: 'Application Version', value: info.application.version, icon: FileCode },
    { label: 'Environment', value: info.application.environment, icon: Terminal },
    { label: 'Frontend', value: info.application.frontend, icon: Monitor },
    { label: 'PHP Version', value: info.server.php_version, icon: FileCode },
    { label: 'Laravel Version', value: info.server.laravel_version, icon: Layers },
    { label: 'Server OS', value: info.server.os, icon: Server },
    { label: 'Web Server', value: info.server.web_server, icon: Server },
    { label: 'Server Time', value: info.server.time, icon: Clock },
    { label: 'Server Status', value: info.server.status, icon: Activity },
    { label: 'Server Uptime', value: info.server.uptime, icon: Clock },
    { label: 'Database Version', value: info.database.version, icon: Database },
    { label: 'Database Name', value: info.database.name, icon: Database },
    { label: 'Database Size', value: info.database.size, icon: HardDrive },
    { label: 'Tables', value: String(info.database.table_count), icon: Table2 },
    { label: 'Storage Total', value: info.storage.total, icon: HardDrive },
    { label: 'Storage Free', value: info.storage.free, icon: HardDrive },
    { label: 'Storage Used', value: info.storage.used, icon: HardDrive },
    { label: 'Cache Driver', value: info.cache.driver, icon: Zap },
    { label: 'Session Driver', value: info.cache.session_driver, icon: KeyRound },
    { label: 'Schools', value: String(info.counts.schools), icon: School },
    { label: 'Active Schools', value: String(info.counts.active_schools), icon: School },
    { label: 'Total Alumni', value: String(info.counts.alumni), icon: GraduationCap },
    { label: 'Registered Users', value: String(info.counts.users), icon: Users },
    { label: 'Last Backup', value: info.last_backup, icon: History },
  ];

  return (
    <SettingsLayout>
      <div>
        <h2 className="text-headline-sm font-headline-sm text-on-surface">System Information</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">View general information about the system and server.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex items-start gap-3 rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
              <card.icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-label-sm text-on-surface-variant">{card.label}</p>
              <p className="mt-1 truncate text-body-md font-label-md text-on-surface" title={card.value}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </SettingsLayout>
  );
}
