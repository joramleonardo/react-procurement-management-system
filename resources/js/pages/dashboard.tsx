// resources/js/pages/dashboard.tsx

import { EmptyState } from '@/components/pms/empty-state';
import { PageHeader } from '@/components/pms/page-header';
import { StatusBadge } from '@/components/pms/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    CircleCheckBig,
    ClipboardList,
    Clock3,
    FileText,
    Plus,
    RotateCcw,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type DashboardStats = {
    total_ppmps: number;
    total_prs: number;
    for_review: number;
    for_revision: number;
    approved: number;
};

type StatusCounts = {
    draft: number;
    submitted: number;
    returned_for_revision: number;
    approved: number;
};

type MonthlyTrendItem = {
    month: string;
    ppmps: number;
    prs: number;
    approved: number;
};

type UserSummary = {
    name: string;
    office_code: string | null;
    office_name: string | null;
    roles: string[];
};

type AttentionItem = {
    key: string;
    type: 'PPMP' | 'PR';
    reference: string;
    status: string;
    office: string | null;
    context: string | null;
    updated_at: string | null;
    url: string;
};

type ActivityItem = {
    key: string;
    type: 'PPMP' | 'PR';
    reference: string;
    action: string;
    status: string;
    actor: string;
    acted_at: string | null;
    url: string;
};

type QuickActions = {
    create_ppmp: boolean;
    view_ppmps: boolean;
    view_prs: boolean;
    review_ppmps: boolean;
    review_prs: boolean;
};

type DashboardProps = {
    userSummary: UserSummary;
    stats: DashboardStats;
    ppmpStatuses: StatusCounts;
    prStatuses: StatusCounts;
    monthlyTrend?: MonthlyTrendItem[];
    attentionItems: AttentionItem[];
    recentActivity: ActivityItem[];
    quickActions: QuickActions;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

const STATUS_COLORS = {
    draft: '#94a3b8',
    submitted: '#2563eb',
    returned_for_revision: '#f59e0b',
    approved: '#10b981',
};

const TREND_COLORS = {
    ppmp: '#2563eb',
    pr: '#7c3aed',
    approved: '#10b981',
};

function formatRole(role: string): string {
    const names: Record<string, string> = {
        'system-administrator': 'System Administrator',
        'ppmp-coordinator': 'PPMP Coordinator',
        'gsps-administrator': 'GSPS Administrator',
        'requesting-personnel': 'Requesting Personnel',
        'budget-officer': 'Budget Officer',
        'approving-authority': 'Approving Authority',
        'procurement-personnel-bac':
            'Procurement Personnel / BAC',
        'management-user': 'Management User',
        auditor: 'Auditor',
    };

    return (
        names[role] ??
        role
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase(),
            )
    );
}

function formatAction(action: string): string {
    const actions: Record<string, string> = {
        create: 'Created',
        submit: 'Submitted for Review',
        resubmit: 'Resubmitted for Review',
        return_for_revision: 'Returned for Revision',
        approve: 'Approved',
    };

    return (
        actions[action] ??
        action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase(),
            )
    );
}

type MetricProps = {
    label: string;
    value: number;
    helper: string;
    icon: LucideIcon;
    accentClass: string;
    numberClass: string;
    iconContainerClass: string;
};

function Metric({
    label,
    value,
    helper,
    icon: Icon,
    accentClass,
    numberClass,
    iconContainerClass,
}: MetricProps) {
    return (
        <div className="relative overflow-hidden border border-border bg-card">
            <div
                className={`absolute inset-x-0 top-0 h-1 ${accentClass}`}
            />

            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                            {label}
                        </div>

                        <div
                            className={`mt-3 text-[42px] font-bold leading-none tabular-nums tracking-[-0.04em] ${numberClass}`}
                        >
                            {value}
                        </div>
                    </div>

                    <div
                        className={`flex size-11 shrink-0 items-center justify-center border ${iconContainerClass}`}
                    >
                        <Icon
                            className="size-5"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                <div className="mt-4 border-t border-border/70 pt-3 text-xs font-medium text-muted-foreground">
                    {helper}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({
    userSummary,
    stats,
    ppmpStatuses,
    prStatuses,
    monthlyTrend = [],
    attentionItems,
    recentActivity,
    quickActions,
}: DashboardProps) {
    const office = [
        userSummary.office_code,
        userSummary.office_name,
    ]
        .filter(Boolean)
        .join(' — ');

    const roles = userSummary.roles
        .map(formatRole)
        .join(', ');

    const attentionCount = attentionItems.length;

    const combinedStatuses = {
        draft:
            ppmpStatuses.draft +
            prStatuses.draft,

        submitted:
            ppmpStatuses.submitted +
            prStatuses.submitted,

        returned_for_revision:
            ppmpStatuses.returned_for_revision +
            prStatuses.returned_for_revision,

        approved:
            ppmpStatuses.approved +
            prStatuses.approved,
    };

    const statusChartData = [
        {
            key: 'draft',
            name: 'Draft',
            value: combinedStatuses.draft,
            color: STATUS_COLORS.draft,
        },
        {
            key: 'submitted',
            name: 'Submitted',
            value: combinedStatuses.submitted,
            color: STATUS_COLORS.submitted,
        },
        {
            key: 'returned_for_revision',
            name: 'Returned',
            value:
                combinedStatuses.returned_for_revision,
            color:
                STATUS_COLORS.returned_for_revision,
        },
        {
            key: 'approved',
            name: 'Approved',
            value: combinedStatuses.approved,
            color: STATUS_COLORS.approved,
        },
    ];

    const totalRecords =
        statusChartData.reduce(
            (total, item) =>
                total + item.value,
            0,
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="pms-page bg-background">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Management"
                    title="Dashboard"
                    description="Monitor procurement plans, Purchase Requests, workflow activity, and records requiring action."
                    actions={
                        quickActions.create_ppmp ? (
                            <Button asChild>
                                <Link href="/ppmps/create">
                                    <Plus className="size-4" />
                                    Create PPMP
                                </Link>
                            </Button>
                        ) : null
                    }
                />

                {/* DASHBOARD CONTENT */}
                <div className="space-y-5 p-4 md:p-6">
                    {/* WELCOME */}
                    <section className="border border-border bg-card">
                        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
                            <div className="border-b border-border p-5 lg:border-b-0 lg:border-r md:p-6">
                                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
                                    Welcome Back
                                </div>

                                <h2 className="mt-1 text-xl font-bold tracking-tight">
                                    {userSummary.name}
                                </h2>

                                <p className="mt-2 text-sm text-muted-foreground">
                                    Here&apos;s what&apos;s happening with
                                    your procurement activities.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2">
                                <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Office
                                    </div>

                                    <div className="mt-2 text-sm font-semibold leading-5">
                                        {office || '—'}
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        System Role
                                    </div>

                                    <div className="mt-2 text-sm font-semibold">
                                        {roles || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* KPI CARDS */}
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Metric
                            label="Total PPMPs"
                            value={stats.total_ppmps}
                            helper="Procurement plans"
                            icon={ClipboardList}
                            accentClass="bg-blue-600"
                            numberClass="text-blue-700 dark:text-blue-400"
                            iconContainerClass="border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
                        />

                        <Metric
                            label="Purchase Requests"
                            value={stats.total_prs}
                            helper="Purchase Request records"
                            icon={FileText}
                            accentClass="bg-violet-600"
                            numberClass="text-violet-700 dark:text-violet-400"
                            iconContainerClass="border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400"
                        />

                        <Metric
                            label="For Review"
                            value={stats.for_review}
                            helper="In review workflow"
                            icon={Clock3}
                            accentClass="bg-amber-500"
                            numberClass="text-amber-600 dark:text-amber-400"
                            iconContainerClass="border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                        />

                        <Metric
                            label="For Revision"
                            value={stats.for_revision}
                            helper="Returned for correction"
                            icon={RotateCcw}
                            accentClass="bg-orange-500"
                            numberClass="text-orange-600 dark:text-orange-400"
                            iconContainerClass="border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400"
                        />

                        <Metric
                            label="Approved"
                            value={stats.approved}
                            helper="Completed approvals"
                            icon={CircleCheckBig}
                            accentClass="bg-emerald-500"
                            numberClass="text-emerald-600 dark:text-emerald-400"
                            iconContainerClass="border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                        />
                    </section>

                    {/* CHARTS */}
                    <section className="grid gap-5 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
                        {/* STATUS DONUT */}
                        <div className="border border-border bg-card">
                            <div className="border-b border-border px-5 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                            Overview
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Procurement Status
                                        </h2>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                                            Total
                                        </div>

                                        <div className="text-2xl font-bold tabular-nums">
                                            {totalRecords}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-[minmax(220px,1fr)_220px]">
                                <div className="h-[290px] p-4">
                                    {totalRecords > 0 ? (
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={
                                                        statusChartData
                                                    }
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={66}
                                                    outerRadius={98}
                                                    paddingAngle={2}
                                                    strokeWidth={0}
                                                >
                                                    {statusChartData.map(
                                                        (
                                                            entry,
                                                        ) => (
                                                            <Cell
                                                                key={
                                                                    entry.key
                                                                }
                                                                fill={
                                                                    entry.color
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </Pie>

                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            No procurement records yet.
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-border md:border-l md:border-t-0">
                                    {statusChartData.map(
                                        (item) => (
                                            <div
                                                key={item.key}
                                                className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className="size-2.5 shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                item.color,
                                                        }}
                                                    />

                                                    <span className="text-xs font-semibold">
                                                        {item.name}
                                                    </span>
                                                </div>

                                                <span className="text-lg font-bold tabular-nums">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TREND GRAPH */}
                        <div className="border border-border bg-card">
                            <div className="border-b border-border px-5 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                            Analytics
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Procurement Trend
                                        </h2>
                                    </div>

                                    <span className="text-xs text-muted-foreground">
                                        Current year
                                    </span>
                                </div>
                            </div>

                            <div className="h-[330px] p-4 md:p-5">
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >
                                    <LineChart
                                        data={monthlyTrend}
                                        margin={{
                                            top: 10,
                                            right: 20,
                                            left: -10,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#dbe2ea"
                                        />

                                        <XAxis
                                            dataKey="month"
                                            tick={{
                                                fontSize: 11,
                                                fill: '#64748b',
                                            }}
                                            tickLine={false}
                                            axisLine={{
                                                stroke: '#cbd5e1',
                                            }}
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                            tick={{
                                                fontSize: 11,
                                                fill: '#64748b',
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        <Tooltip />

                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            wrapperStyle={{
                                                fontSize: 11,
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="ppmps"
                                            name="PPMP"
                                            stroke={
                                                TREND_COLORS.ppmp
                                            }
                                            strokeWidth={2.5}
                                            dot={{
                                                r: 3,
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 5,
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="prs"
                                            name="Purchase Requests"
                                            stroke={
                                                TREND_COLORS.pr
                                            }
                                            strokeWidth={2.5}
                                            dot={{
                                                r: 3,
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 5,
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="approved"
                                            name="Approved"
                                            stroke={
                                                TREND_COLORS.approved
                                            }
                                            strokeWidth={2.5}
                                            dot={{
                                                r: 3,
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 5,
                                            }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* ATTENTION + QUICK ACTIONS */}
                    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                        {/* ATTENTION */}
                        <div className="border border-border bg-card">
                            <div
                                className={`border-b px-5 py-4 ${
                                    attentionCount > 0
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border bg-secondary/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {attentionCount >
                                                0 && (
                                                <AlertTriangle className="size-4" />
                                            )}

                                            <h2 className="text-sm font-bold uppercase tracking-[0.07em]">
                                                Needs Your Attention
                                            </h2>
                                        </div>

                                        <p
                                            className={`mt-1 text-xs ${
                                                attentionCount >
                                                0
                                                    ? 'text-white/80'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            Records currently assigned
                                            to your role for action.
                                        </p>
                                    </div>

                                    <div
                                        className={`text-3xl font-bold tabular-nums ${
                                            attentionCount >
                                            0
                                                ? 'text-white'
                                                : 'text-primary'
                                        }`}
                                    >
                                        {attentionCount}
                                    </div>
                                </div>
                            </div>

                            {attentionCount === 0 ? (
                                <div className="flex items-center gap-3 px-5 py-6">
                                    <div className="flex size-10 shrink-0 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <CheckCircle2 className="size-5" />
                                    </div>

                                    <div>
                                        <div className="text-sm font-semibold">
                                            No records require action
                                        </div>

                                        <div className="mt-1 text-xs text-muted-foreground">
                                            No action is currently
                                            assigned to your account.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="pms-table min-w-[850px]">
                                        <thead>
                                            <tr>
                                                <th>Record</th>
                                                <th>Office</th>
                                                <th>Context</th>
                                                <th>Status</th>
                                                <th>Updated</th>
                                                <th className="text-right">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {attentionItems.map(
                                                (item) => (
                                                    <tr
                                                        key={
                                                            item.key
                                                        }
                                                    >
                                                        <td>
                                                            <Link
                                                                href={
                                                                    item.url
                                                                }
                                                                className="inline-flex border border-blue-200 bg-blue-50 px-2 py-1 font-bold text-blue-700 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                                                            >
                                                                {
                                                                    item.reference
                                                                }
                                                            </Link>

                                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                                {
                                                                    item.type
                                                                }
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {item.office ??
                                                                '—'}
                                                        </td>

                                                        <td>
                                                            {item.context ??
                                                                '—'}
                                                        </td>

                                                        <td>
                                                            <StatusBadge
                                                                status={
                                                                    item.status
                                                                }
                                                            />
                                                        </td>

                                                        <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                            {item.updated_at ??
                                                                '—'}
                                                        </td>

                                                        <td>
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={
                                                                            item.url
                                                                        }
                                                                    >
                                                                        Review
                                                                        <ArrowRight className="size-3.5" />
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* QUICK ACTIONS */}
                        <div className="border border-border bg-card">
                            <div className="border-b border-border bg-secondary/40 px-5 py-4">
                                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                    Shortcuts
                                </div>

                                <h2 className="mt-1 text-sm font-bold">
                                    Quick Actions
                                </h2>
                            </div>

                            <div className="divide-y divide-border">
                                {quickActions.create_ppmp && (
                                    <Link
                                        href="/ppmps/create"
                                        className="group grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-4 hover:bg-blue-50/70 dark:hover:bg-blue-950/20"
                                    >
                                        <div className="flex size-11 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                                            <Plus className="size-5" />
                                        </div>

                                        <div>
                                            <div className="text-sm font-bold">
                                                Create PPMP
                                            </div>

                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                Start a new plan
                                            </div>
                                        </div>

                                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
                                    </Link>
                                )}

                                {quickActions.view_ppmps && (
                                    <Link
                                        href="/ppmps"
                                        className="group grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-4 hover:bg-violet-50/70 dark:hover:bg-violet-950/20"
                                    >
                                        <div className="flex size-11 items-center justify-center border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400">
                                            <ClipboardList className="size-5" />
                                        </div>

                                        <div>
                                            <div className="text-sm font-bold">
                                                View PPMPs
                                            </div>

                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                Browse procurement plans
                                            </div>
                                        </div>

                                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
                                    </Link>
                                )}

                                {quickActions.view_prs && (
                                    <Link
                                        href="/purchase-requests"
                                        className="group grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-4 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20"
                                    >
                                        <div className="flex size-11 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            <FileText className="size-5" />
                                        </div>

                                        <div>
                                            <div className="text-sm font-bold">
                                                Purchase Requests
                                            </div>

                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                Browse PR records
                                            </div>
                                        </div>

                                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* RECENT ACTIVITY */}
                    <section className="border border-border bg-card">
                        <div className="flex flex-col gap-2 border-b border-border bg-secondary/40 px-5 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                    Activity Log
                                </div>

                                <h2 className="mt-1 text-base font-bold">
                                    Recent Activity
                                </h2>
                            </div>

                            <span className="text-xs text-muted-foreground">
                                Latest PPMP and Purchase Request
                                workflow activity
                            </span>
                        </div>

                        {recentActivity.length === 0 ? (
                            <EmptyState
                                title="No recent activity"
                                description="Workflow activity will appear here when procurement records are processed."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="pms-table min-w-[1000px]">
                                    <thead>
                                        <tr>
                                            <th className="w-[175px]">
                                                Date / Time
                                            </th>
                                            <th className="w-[90px]">
                                                Type
                                            </th>
                                            <th className="w-[210px]">
                                                Reference
                                            </th>
                                            <th>
                                                Activity
                                            </th>
                                            <th className="w-[220px]">
                                                Performed By
                                            </th>
                                            <th className="w-[190px]">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {recentActivity.map(
                                            (activity) => (
                                                <tr
                                                    key={
                                                        activity.key
                                                    }
                                                >
                                                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                        {activity.acted_at ??
                                                            '—'}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                                                                activity.type ===
                                                                'PPMP'
                                                                    ? 'text-blue-600 dark:text-blue-400'
                                                                    : 'text-violet-600 dark:text-violet-400'
                                                            }`}
                                                        >
                                                            {
                                                                activity.type
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <Link
                                                            href={
                                                                activity.url
                                                            }
                                                            className={`inline-block border px-2 py-1 font-bold ${
                                                                activity.type ===
                                                                'PPMP'
                                                                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                                                                    : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300'
                                                            }`}
                                                        >
                                                            {
                                                                activity.reference
                                                            }
                                                        </Link>
                                                    </td>

                                                    <td className="font-medium">
                                                        {formatAction(
                                                            activity.action,
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            activity.actor
                                                        }
                                                    </td>

                                                    <td>
                                                        <StatusBadge
                                                            status={
                                                                activity.status
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
