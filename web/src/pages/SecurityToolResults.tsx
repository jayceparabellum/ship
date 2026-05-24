import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/cn';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface ProbeFinding {
  id: string;
  surface: string;
  severity: Severity;
  title: string;
  passed: boolean;
  details: string;
  remediation?: string;
}

interface StaticCheck {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  passed: boolean;
  remediation?: string;
}

interface SecuritySummary {
  totalChecks: number;
  passed: number;
  failed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info?: number;
}

interface ProbeReport {
  generatedAt: string;
  tool: string;
  target: {
    apiUrl: string;
    webUrl: string;
    email?: string;
  };
  summary: SecuritySummary;
  findings: ProbeFinding[];
  category8Metrics?: Record<string, unknown>;
}

interface StaticReport {
  generatedAt: string;
  tool: string;
  git?: {
    branch?: string;
    commit?: string;
  };
  summary: SecuritySummary;
  dependencyAudit?: {
    skipped: boolean;
    vulnerabilitySummary?: Record<string, number>;
  };
  checks: StaticCheck[];
}

interface SecurityToolPayload {
  probeReport: ProbeReport;
  staticReport: StaticReport;
  source: {
    probe: 's3' | 'local';
    static: 's3' | 'local';
    bucket: string | null;
    prefix: string;
  };
}

interface ApiEnvelope {
  success: boolean;
  data: SecurityToolPayload;
}

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

async function fetchSecurityToolResults(): Promise<SecurityToolPayload> {
  const response = await apiGet('/api/security-tool/latest');
  if (!response.ok) {
    throw new Error('Security tool results are unavailable');
  }

  const body = (await response.json()) as ApiEnvelope;
  return body.data;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusLabel(failed: number): string {
  return failed === 0 ? 'Passing' : 'Needs attention';
}

function getSeverityClass(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'border-red-500/40 bg-red-500/10 text-red-200';
    case 'high':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-200';
    case 'medium':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100';
    case 'low':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-200';
    case 'info':
      return 'border-zinc-500/40 bg-zinc-500/10 text-zinc-200';
  }
}

export function SecurityToolResultsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['security-tool', 'latest'],
    queryFn: fetchSecurityToolResults,
    staleTime: 1000 * 60,
  });

  const failedStaticChecks = useMemo(() => {
    return [...(data?.staticReport.checks ?? [])]
      .filter(check => !check.passed)
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [data?.staticReport.checks]);

  const probeFindings = useMemo(() => {
    return [...(data?.probeReport.findings ?? [])]
      .sort((a, b) => Number(a.passed) - Number(b.passed) || severityOrder[a.severity] - severityOrder[b.severity]);
  }, [data?.probeReport.findings]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted">Loading security tool results...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <ShieldAlertIcon className="h-8 w-8 text-yellow-200" />
        <div className="text-sm font-medium text-foreground">Security tool results are unavailable</div>
        <button
          onClick={() => refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-border/40 hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const probeSummary = data.probeReport.summary;
  const staticSummary = data.staticReport.summary;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Security Tool Results</h1>
            <p className="mt-1 text-sm text-muted">
              Latest Category 8 static scan and active live-app probe output.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <section className="border-b border-border px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="Live probe"
              value={`${probeSummary.passed}/${probeSummary.totalChecks}`}
              detail={`${probeSummary.failed} failed`}
              status={getStatusLabel(probeSummary.failed)}
            />
            <SummaryMetric
              label="Static scan"
              value={`${staticSummary.passed}/${staticSummary.totalChecks}`}
              detail={`${staticSummary.failed} failed`}
              status={getStatusLabel(staticSummary.failed)}
            />
            <SummaryMetric
              label="High/Critical CVEs"
              value={String(data.probeReport.category8Metrics?.highCriticalDependencyCves ?? 0)}
              detail="from active dependency probe"
              status="Passing"
            />
            <SummaryMetric
              label="Report source"
              value={data.source.probe === 's3' ? 'AWS S3' : 'Local'}
              detail={data.source.bucket ? `${data.source.bucket}/${data.source.prefix}` : 'checked-in audit evidence'}
              status="Ready"
            />
          </div>
        </section>

        <section className="grid gap-0 border-b border-border xl:grid-cols-[1fr_360px]">
          <div className="px-6 py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Active Live-App Probe</h2>
                <p className="mt-1 text-sm text-muted">
                  Ran {formatDateTime(data.probeReport.generatedAt)} against {data.probeReport.target.webUrl}.
                </p>
              </div>
              <StatusBadge failed={probeSummary.failed} />
            </div>

            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-border/20 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Check</th>
                    <th className="px-4 py-2 font-medium">Surface</th>
                    <th className="px-4 py-2 font-medium">Severity</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {probeFindings.map(finding => (
                    <tr key={finding.id} className="hover:bg-border/20">
                      <td className="max-w-[360px] px-4 py-3">
                        <div className="font-medium text-foreground">{finding.title}</div>
                        <div className="mt-1 truncate text-xs text-muted">{finding.details}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{finding.surface}</td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          finding.passed ? 'bg-green-500/15 text-green-200' : 'bg-red-500/15 text-red-200'
                        )}>
                          {finding.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="border-t border-border px-6 py-5 xl:border-l xl:border-t-0">
            <h2 className="text-base font-semibold text-foreground">Run Metadata</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <MetadataRow label="Probe tool" value={data.probeReport.tool} />
              <MetadataRow label="Static tool" value={data.staticReport.tool} />
              <MetadataRow label="Branch" value={data.staticReport.git?.branch ?? 'unknown'} />
              <MetadataRow label="Commit" value={data.staticReport.git?.commit ?? 'unknown'} />
              <MetadataRow label="Probe account" value={data.probeReport.target.email ?? 'not reported'} />
              <MetadataRow label="API target" value={data.probeReport.target.apiUrl} />
            </dl>
          </aside>
        </section>

        <section className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Static Scanner Findings</h2>
              <p className="mt-1 text-sm text-muted">
                Failed scanner checks are listed first so remediation work is visible.
              </p>
            </div>
            <StatusBadge failed={staticSummary.failed} />
          </div>

          {failedStaticChecks.length === 0 ? (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
              Static scanner has no failed checks in the latest report.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {failedStaticChecks.map(check => (
                <div key={check.id} className="rounded-md border border-border bg-background px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{check.title}</div>
                      <div className="mt-1 text-xs uppercase text-muted">{check.category}</div>
                    </div>
                    <SeverityBadge severity={check.severity} />
                  </div>
                  {check.remediation && (
                    <p className="mt-3 text-sm leading-6 text-muted">{check.remediation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase text-muted">{label}</div>
        <div className="rounded-full bg-border/40 px-2 py-0.5 text-xs text-muted">{status}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-sm text-muted">{detail}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn(
      'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
      getSeverityClass(severity)
    )}>
      {severity}
    </span>
  );
}

function StatusBadge({ failed }: { failed: number }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      failed === 0 ? 'bg-green-500/15 text-green-200' : 'bg-yellow-500/15 text-yellow-100'
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', failed === 0 ? 'bg-green-300' : 'bg-yellow-200')} />
      {failed === 0 ? 'Passing' : `${failed} finding${failed === 1 ? '' : 's'}`}
    </span>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.1 5.6L4 10m16 4l-2.1 4.4A8 8 0 014 14" />
    </svg>
  );
}

function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l7 3v5c0 4.55-2.91 8.57-7 10-4.09-1.43-7-5.45-7-10V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v5m0 4h.01" />
    </svg>
  );
}
