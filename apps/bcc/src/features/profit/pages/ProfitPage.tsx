import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type {
  ProfitDistributionData,
  ProfitScheduleData,
  ProfitScheduleDayData,
} from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  ContentCard,
  DataTable,
  FormField,
  Icon,
  Input,
  LoadingScreen,
  Modal,
  Switch,
  type DataTableColumn,
} from '@superdreams/ui';

import {
  bpsToPct,
  buildMonthGrid,
  currentMonth,
  formatMonthLabel,
  isMonthKey,
  shiftMonth,
  usd,
} from '../format';
import {
  useDistributeProfit,
  usePlanSchedule,
  useProfitHistory,
  useProfitSchedule,
  usePublishSchedule,
  useSetScheduleDay,
} from '../hooks';

function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// --- Plan dialog -------------------------------------------------------------

function PlanDialog({
  isOpen,
  month,
  initial,
  onClose,
}: {
  isOpen: boolean;
  month: string;
  initial: ProfitScheduleData | null;
  onClose: () => void;
}) {
  const plan = usePlanSchedule();
  const notify = useNotificationStore((state) => state.notify);
  const [memberPct, setMemberPct] = useState(initial ? String(initial.memberMonthlyBps / 100) : '');
  const [partnerPct, setPartnerPct] = useState(
    initial ? String(initial.partnerMonthlyBps / 100) : '',
  );

  const memberN = Number(memberPct);
  const partnerN = Number(partnerPct);
  let error: string | undefined;
  if (!Number.isFinite(memberN) || memberN < 0 || memberN > 10_000) {
    error = 'Member monthly target must be between 0 and 10,000%.';
  } else if (!Number.isFinite(partnerN) || partnerN < 0 || partnerN > 10_000) {
    error = 'Partner monthly target must be between 0 and 10,000%.';
  }

  function submit() {
    if (error || plan.isPending) {
      return;
    }
    plan.mutate(
      {
        month,
        memberMonthlyBps: pctToBps(memberN),
        partnerMonthlyBps: pctToBps(partnerN),
      },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Schedule planned (draft)' });
          onClose();
        },
      },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Plan ${month} schedule`}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The backend spreads each monthly target across the month&apos;s days at distinct times.
          Planning replaces any existing draft for {month}.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Member monthly target (%)" required>
            <Input
              aria-label="Member monthly target (%)"
              type="number"
              min={0}
              step="0.01"
              value={memberPct}
              onChange={(e) => setMemberPct(e.target.value)}
            />
          </FormField>
          <FormField label="Partner monthly target (%)" required>
            <Input
              aria-label="Partner monthly target (%)"
              type="number"
              min={0}
              step="0.01"
              value={partnerPct}
              onChange={(e) => setPartnerPct(e.target.value)}
            />
          </FormField>
        </div>
        {error ? (
          <Alert variant="destructive" title="Fix before planning">
            {error}
          </Alert>
        ) : null}
        {plan.isError ? (
          <Alert variant="destructive" title="Could not plan schedule">
            {plan.error.message}
          </Alert>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            isLoading={plan.isPending}
            disabled={Boolean(error) || plan.isPending}
            onClick={submit}
          >
            Plan schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Day fine-tune dialog ----------------------------------------------------

function DayDialog({ day, onClose }: { day: ProfitScheduleDayData; onClose: () => void }) {
  const setDay = useSetScheduleDay();
  const notify = useNotificationStore((state) => state.notify);
  const [memberPct, setMemberPct] = useState(String(day.memberBps / 100));
  const [partnerPct, setPartnerPct] = useState(String(day.partnerBps / 100));
  const [off, setOff] = useState(day.off);

  const memberN = Number(memberPct);
  const partnerN = Number(partnerPct);
  const error =
    !Number.isFinite(memberN) || memberN < 0 || !Number.isFinite(partnerN) || partnerN < 0
      ? 'Rates must be zero or greater.'
      : undefined;

  function submit() {
    if (error || setDay.isPending) {
      return;
    }
    setDay.mutate(
      { day: day.day, memberBps: pctToBps(memberN), partnerBps: pctToBps(partnerN), off },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: `Day ${day.day} updated` });
          onClose();
        },
      },
    );
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${day.day}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Member rate (%)" required>
            <Input
              aria-label="Member rate (%)"
              type="number"
              min={0}
              step="0.01"
              value={memberPct}
              onChange={(e) => setMemberPct(e.target.value)}
            />
          </FormField>
          <FormField label="Partner rate (%)" required>
            <Input
              aria-label="Partner rate (%)"
              type="number"
              min={0}
              step="0.01"
              value={partnerPct}
              onChange={(e) => setPartnerPct(e.target.value)}
            />
          </FormField>
        </div>
        <Switch checked={off} onCheckedChange={setOff} label="Day off (no distribution)" />
        {error ? (
          <Alert variant="destructive" title="Fix before saving">
            {error}
          </Alert>
        ) : null}
        {setDay.isError ? (
          <Alert variant="destructive" title="Could not update day">
            {setDay.error.message}
          </Alert>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            isLoading={setDay.isPending}
            disabled={Boolean(error) || setDay.isPending}
            onClick={submit}
          >
            Save day
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Overview ----------------------------------------------------------------

function OverviewCard({
  schedule,
  onReplan,
  onPublish,
}: {
  schedule: ProfitScheduleData;
  onReplan: () => void;
  onPublish: () => void;
}) {
  const { can } = usePermissions();
  const canSchedule = can('profit.schedule');
  const isDraft = schedule.status === 'DRAFT';

  return (
    <ContentCard
      title={`Schedule — ${schedule.month}`}
      description="Monthly daily-profit targets and publication state"
      actions={
        canSchedule && isDraft ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReplan}>
              Re-plan
            </Button>
            <Button size="sm" onClick={onPublish}>
              Publish
            </Button>
          </div>
        ) : undefined
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Badge soft variant={schedule.status === 'PUBLISHED' ? 'success' : 'secondary'}>
              {schedule.status}
            </Badge>
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Member monthly</dt>
          <dd className="font-medium">{bpsToPct(schedule.memberMonthlyBps)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Partner monthly</dt>
          <dd className="font-medium">{bpsToPct(schedule.partnerMonthlyBps)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-muted-foreground">Published</dt>
          <dd className="font-medium">
            {schedule.publishedAt ? new Date(schedule.publishedAt).toLocaleString() : '—'}
          </dd>
        </div>
      </dl>
    </ContentCard>
  );
}

// --- Daily table -------------------------------------------------------------

function DailyTable({
  schedule,
  onEditDay,
  onDistribute,
}: {
  schedule: ProfitScheduleData;
  onEditDay: (day: ProfitScheduleDayData) => void;
  onDistribute: (day: ProfitScheduleDayData) => void;
}) {
  const { can } = usePermissions();
  const canSchedule = can('profit.schedule');
  const canDistribute = can('profit.distribute');
  const isDraft = schedule.status === 'DRAFT';
  const isPublished = schedule.status === 'PUBLISHED';

  const columns: DataTableColumn<ProfitScheduleDayData>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.day },
    {
      id: 'member',
      header: 'Member rate',
      align: 'right',
      cell: (row) => (row.off ? '—' : bpsToPct(row.memberBps)),
    },
    {
      id: 'partner',
      header: 'Partner rate',
      align: 'right',
      cell: (row) => (row.off ? '—' : bpsToPct(row.partnerBps)),
    },
    { id: 'time', header: 'Time', cell: (row) => row.distributeAt ?? '—' },
    {
      id: 'off',
      header: 'Status',
      cell: (row) =>
        row.off ? (
          <Badge soft variant="secondary">
            Off
          </Badge>
        ) : (
          <Badge soft variant="success">
            On
          </Badge>
        ),
    },
  ];

  const hasRowActions = (isDraft && canSchedule) || (isPublished && canDistribute);

  return (
    <ContentCard title="Daily schedule" description="Backend-generated per-day rates and times">
      <DataTable
        columns={columns}
        rows={schedule.days}
        getRowId={(row) => row.day}
        emptyState="This schedule has no days."
        rowActions={
          hasRowActions
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {isDraft && canSchedule ? (
                    <Button size="sm" variant="outline" onClick={() => onEditDay(row)}>
                      Edit
                    </Button>
                  ) : null}
                  {isPublished && canDistribute && !row.off ? (
                    <Button size="sm" variant="destructive" onClick={() => onDistribute(row)}>
                      Distribute
                    </Button>
                  ) : null}
                </div>
              )
            : undefined
        }
      />
    </ContentCard>
  );
}

// --- Calendar ----------------------------------------------------------------

/** One in-month day cell's body: rates, off/status badges, time, distributed marker. */
function DayCellContent({
  cell,
  data,
  status,
  distributed,
}: {
  cell: { dayNum: number; dayStr: string };
  data: ProfitScheduleDayData | undefined;
  status: ProfitScheduleData['status'];
  distributed: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold">{cell.dayNum}</span>
        {data ? (
          <Badge
            soft
            variant={status === 'PUBLISHED' ? 'success' : 'secondary'}
            className="text-[10px]"
          >
            {status === 'PUBLISHED' ? 'Published' : 'Draft'}
          </Badge>
        ) : null}
      </div>
      {data ? (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {data.off ? (
            <Badge soft variant="secondary" className="text-[10px]">
              Off
            </Badge>
          ) : (
            <>
              <div>M {bpsToPct(data.memberBps)}</div>
              <div>P {bpsToPct(data.partnerBps)}</div>
            </>
          )}
          {data.distributeAt ? <div className="tabular-nums">{data.distributeAt}</div> : null}
          {distributed ? (
            <Badge soft variant="info" className="text-[10px]">
              Distributed
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProfitCalendar({
  schedule,
  distributedDays,
  onEditDay,
  onDistribute,
}: {
  schedule: ProfitScheduleData;
  distributedDays: Set<string>;
  onEditDay: (day: ProfitScheduleDayData) => void;
  onDistribute: (day: ProfitScheduleDayData) => void;
}) {
  const { can } = usePermissions();
  const canSchedule = can('profit.schedule');
  const canDistribute = can('profit.distribute');
  const isDraft = schedule.status === 'DRAFT';
  const isPublished = schedule.status === 'PUBLISHED';
  const dayMap = new Map(schedule.days.map((d) => [d.day, d]));
  const cells = buildMonthGrid(schedule.month);

  const cellBase = 'min-h-[92px] rounded-md border border-border bg-card p-2 text-left';

  return (
    <ContentCard
      title={`Calendar — ${formatMonthLabel(schedule.month)}`}
      description="Backend-generated per-day rates and times. Click a draft day to fine-tune it."
    >
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {weekday}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`pad-${index}`} aria-hidden className="min-h-[92px]" />;
          }
          const data = dayMap.get(cell.dayStr);
          const distributed = distributedDays.has(cell.dayStr);
          const editable = isDraft && canSchedule && Boolean(data);
          const showDistribute = isPublished && canDistribute && Boolean(data) && !data?.off;

          const body = (
            <DayCellContent
              cell={cell}
              data={data}
              status={schedule.status}
              distributed={distributed}
            />
          );

          if (editable && data) {
            return (
              <button
                key={cell.dayStr}
                type="button"
                aria-label={`Edit ${cell.dayStr}`}
                onClick={() => onEditDay(data)}
                className={`${cellBase} transition-colors hover:border-primary hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {body}
              </button>
            );
          }

          return (
            <div key={cell.dayStr} className={cellBase}>
              {body}
              {showDistribute && data ? (
                <Button
                  size="xs"
                  variant="destructive"
                  className="mt-2 w-full"
                  onClick={() => onDistribute(data)}
                >
                  Distribute
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </ContentCard>
  );
}

// --- History -----------------------------------------------------------------

function HistoryCard({ month }: { month: string }) {
  const range = { from: `${month}-01`, to: `${month}-31` };
  const history = useProfitHistory(range, /^\d{4}-\d{2}$/.test(month));

  const columns: DataTableColumn<ProfitDistributionData>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.day },
    { id: 'ref', header: 'Reference', cell: (row) => row.reference },
    {
      id: 'member',
      header: 'Members paid',
      align: 'right',
      cell: (row) => `${usd(row.memberAmountCents)} · ${row.membersCredited.toLocaleString()}`,
    },
    {
      id: 'partner',
      header: 'Partners paid',
      align: 'right',
      cell: (row) => `${usd(row.partnerAmountCents)} · ${row.partnersCredited.toLocaleString()}`,
    },
  ];

  return (
    <ContentCard title="Distribution history" description={`Credited distributions in ${month}`}>
      {history.isError ? (
        <Alert variant="destructive" title="Could not load history">
          <div className="space-y-3">
            <p>{history.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void history.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={history.data ?? []}
          getRowId={(row) => row.day}
          isLoading={history.isPending}
          emptyState="No distributions recorded for this month."
        />
      )}
    </ContentCard>
  );
}

// --- Page --------------------------------------------------------------------

/** Admin daily-profit configuration & distribution (requires profit.schedule). */
export default function ProfitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const month = monthParam && isMonthKey(monthParam) ? monthParam : currentMonth();

  function setMonth(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('month', next);
        return params;
      },
      { replace: true },
    );
  }

  const query = useProfitSchedule(month);
  const publish = usePublishSchedule();
  const distribute = useDistributeProfit();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canSchedule = can('profit.schedule');
  const canDistribute = can('profit.distribute');

  const [view, setView] = useState<'calendar' | 'table'>('calendar');
  const [planOpen, setPlanOpen] = useState(false);
  const [editDay, setEditDay] = useState<ProfitScheduleDayData | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [pendingDistribute, setPendingDistribute] = useState<ProfitScheduleDayData | null>(null);
  const submittingRef = useRef(false);

  // History is authoritative for which days are already distributed. It is gated
  // on `profit.distribute` (same as the backend history route) and shares its
  // React Query cache key with the HistoryCard below.
  const history = useProfitHistory(
    { from: `${month}-01`, to: `${month}-31` },
    canDistribute && isMonthKey(month),
  );
  const distributedDays = new Set((history.data ?? []).map((d) => d.day));

  const noSchedule = query.isError && query.error.status === 404;

  function doPublish() {
    if (publish.isPending) {
      return;
    }
    publish.mutate(
      { month },
      {
        onSuccess: () => notify({ variant: 'success', title: 'Schedule published' }),
        onError: (err) =>
          notify({ variant: 'error', title: 'Could not publish', description: err.message }),
        onSettled: () => setConfirmPublish(false),
      },
    );
  }

  function doDistribute() {
    if (!pendingDistribute || submittingRef.current || distribute.isPending) {
      return;
    }
    submittingRef.current = true;
    const day = pendingDistribute.day;
    distribute.mutate(
      { day },
      {
        onSuccess: (result) =>
          notify({
            variant: 'success',
            title: `Distributed ${day}`,
            description: `${result.membersCredited + result.partnersCredited} wallets credited`,
          }),
        onError: (err) =>
          notify({ variant: 'error', title: 'Distribution failed', description: err.message }),
        onSettled: () => {
          submittingRef.current = false;
          setPendingDistribute(null);
        },
      },
    );
  }

  return (
    <>
      <Helmet>
        <title>Daily profit</title>
      </Helmet>
      <PageHeader
        title="Daily profit"
        description="Plan, publish and distribute the monthly daily-profit schedule"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-label="Previous month"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <Icon name="chevron-left" size="sm" />
            </Button>
            <div
              data-testid="current-month-label"
              className="min-w-[9rem] text-center text-base font-semibold"
            >
              {formatMonthLabel(month)}
            </div>
            <Button
              size="sm"
              variant="outline"
              aria-label="Next month"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <Icon name="chevron-right" size="sm" />
            </Button>
            <FormField label="Jump to month">
              <Input
                aria-label="Schedule month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </FormField>
            <Button size="sm" variant="ghost" onClick={() => setMonth(currentMonth())}>
              This month
            </Button>
          </div>
        }
      />

      {query.isPending ? (
        <LoadingScreen message="Loading schedule…" />
      ) : noSchedule ? (
        <ContentCard title={`No schedule for ${month}`}>
          <p className="mb-4 text-sm text-muted-foreground">
            No daily-profit schedule has been planned for {formatMonthLabel(month)} yet.
          </p>
          {canSchedule ? (
            <Button onClick={() => setPlanOpen(true)}>Plan schedule</Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              You do not have permission to plan a schedule.
            </p>
          )}
        </ContentCard>
      ) : query.isError || !query.data ? (
        <Alert variant="destructive" title="Could not load schedule">
          <div className="space-y-3">
            <p>{query.error?.message ?? 'The schedule is unavailable.'}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="space-y-6">
          <OverviewCard
            schedule={query.data}
            onReplan={() => setPlanOpen(true)}
            onPublish={() => setConfirmPublish(true)}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant={view === 'calendar' ? 'primary' : 'outline'}
              aria-pressed={view === 'calendar'}
              onClick={() => setView('calendar')}
            >
              Calendar view
            </Button>
            <Button
              size="sm"
              variant={view === 'table' ? 'primary' : 'outline'}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              Table view
            </Button>
          </div>
          {view === 'calendar' ? (
            <ProfitCalendar
              schedule={query.data}
              distributedDays={distributedDays}
              onEditDay={(day) => setEditDay(day)}
              onDistribute={(day) => setPendingDistribute(day)}
            />
          ) : (
            <DailyTable
              schedule={query.data}
              onEditDay={(day) => setEditDay(day)}
              onDistribute={(day) => setPendingDistribute(day)}
            />
          )}
          {canDistribute ? <HistoryCard month={month} /> : null}
        </div>
      )}

      {planOpen ? (
        <PlanDialog
          isOpen={planOpen}
          month={month}
          initial={query.data ?? null}
          onClose={() => setPlanOpen(false)}
        />
      ) : null}
      {editDay ? <DayDialog day={editDay} onClose={() => setEditDay(null)} /> : null}

      <ConfirmationDialog
        isOpen={confirmPublish}
        title={`Publish the ${month} schedule?`}
        description="Once published the daily rates are locked and can no longer be edited. Distribution uses these published rates."
        confirmLabel="Publish"
        mobileSheet
        isConfirming={publish.isPending}
        onConfirm={doPublish}
        onCancel={() => setConfirmPublish(false)}
      />

      <ConfirmationDialog
        isOpen={pendingDistribute !== null}
        title={pendingDistribute ? `Distribute profit for ${pendingDistribute.day}?` : ''}
        description="This credits real profit to every eligible member's financial wallet using the backend's published rates. It moves money and cannot be undone. Re-running only credits members not yet paid."
        confirmLabel="Distribute now"
        tone="destructive"
        mobileSheet
        isConfirming={distribute.isPending}
        onConfirm={doDistribute}
        onCancel={() => setPendingDistribute(null)}
      />
    </>
  );
}
