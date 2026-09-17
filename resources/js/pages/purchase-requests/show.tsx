// resources/js/pages/purchase-requests/show.tsx

import { PageHeader } from '@/components/pms/page-header';
import { StatusBadge } from '@/components/pms/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    Download,
    ExternalLink,
    FileText,
    History,
    Info,
    Paperclip,
    Pencil,
    RotateCcw,
    Send,
    UsersRound,
    X,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';

type Office = {
    id: number;
    code: string;
    name: string;
};

type Requester = {
    id: number;
    name: string;
    position_title: string | null;
};

type ApprovalRecorder = {
    id: number;
    name: string;
    position_title: string | null;
};

type SourcePpmp = {
    id: number;
    ppmp_no: string;
    fiscal_year: number;
    plan_type: string;
    indicative_no: number | null;
    status: string;
    total_budget: string;
};

type HistoricalPpmpItem = {
    id: number;
    sort_order: number;
    description_objective: string | null;
    source_of_funds: string | null;
    estimated_budget: string | null;
};

type HistoricalPpmpItemDetail = {
    id: number;
    sort_order: number;
    project_type: string | null;
    quantity: string | null;
    unit: string | null;
    item_description: string | null;
    size_specification: string | null;
    estimated_amount: string | null;
};

type PurchaseRequestItem = {
    id: number;
    ppmp_item_id: number | null;
    ppmp_item_detail_id: number | null;
    stock_property_no: string | null;
    unit: string | null;
    item_description: string | null;
    quantity: string | null;
    unit_cost: string | null;
    total_cost: string | null;
    sort_order: number;
    ppmp_item: HistoricalPpmpItem | null;
    ppmp_item_detail: HistoricalPpmpItemDetail | null;
};

type Attachment = {
    id: number;
    document_type: string;
    original_name: string;
    file_size: number | null;
    created_at: string | null;
    uploaded_by: string;
};

type StatusHistoryItem = {
    id: number;
    from_status: string | null;
    to_status: string;
    action: string;
    remarks: string | null;
    action_by: string;
    acted_at: string | null;
};

type PurchaseRequest = {
    id: number;
    pr_no: string;
    status: string;
    entity_name: string;
    fund_cluster: string | null;
    responsibility_center_code: string | null;
    pr_date: string | null;
    purpose: string | null;
    total_amount: string;
    requested_by_name: string | null;
    requested_by_designation: string | null;
    approved_by_name: string | null;
    approved_by_designation: string | null;
    remarks: string | null;
    submitted_at: string | null;
    returned_at: string | null;
    approved_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    ppmp: SourcePpmp;
    office: Office;
    requester: Requester;
    approval_recorder: ApprovalRecorder | null;
    items: PurchaseRequestItem[];
    attachments: Attachment[];
    status_histories: StatusHistoryItem[];
};

type ShowProps = {
    purchaseRequest: PurchaseRequest;
    can: {
        update: boolean;
        submit: boolean;
        resubmit: boolean;
        return: boolean;
        approve: boolean;
    };
    flash: {
        success: string | null;
    };
};

type ShowTab = 'information' | 'items' | 'signatories' | 'attachments' | 'history';

function formatCurrency(value: string | number | null): string {
    const amount =
        value === null
            ? 0
            : Number(String(value).replace(/,/g, ''));

    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function formatQuantity(value: string | null): string {
    if (!value) {
        return '—';
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return value;
    }

    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(amount);
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
    }).format(date);
}

function formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );
    const size = bytes / Math.pow(1024, index);

    return `${size.toFixed(1)} ${units[index]}`;
}

function formatAction(action: string): string {
    const actions: Record<string, string> = {
        create: 'Created',
        update: 'Updated',
        submit: 'Submitted for Review',
        resubmit: 'Resubmitted for Review',
        return_for_revision: 'Returned for Revision',
        approve: 'Approved',
    };

    return actions[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function workflowDescription(status: string): string {
    switch (status) {
        case 'submitted':
            return 'This Purchase Request has been submitted and is awaiting GSPS review.';
        case 'returned_for_revision':
            return 'This Purchase Request was returned to the requester and requires revision before it can be resubmitted.';
        case 'approved':
            return 'This Purchase Request has been approved and its allocated budget is locked against the PPMP.';
        case 'draft':
        default:
            return 'This Purchase Request is currently a draft and has not yet been submitted for review. Items and details may still be edited.';
    }
}

function formatPlanType(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requirementLabel(item: PurchaseRequestItem): string {
    const parent = item.ppmp_item;
    const detail = item.ppmp_item_detail;

    if (parent && detail) {
        return `#${parent.sort_order}.${detail.sort_order}`;
    }

    if (parent) {
        return `#${parent.sort_order}`;
    }

    return 'Legacy';
}

function requirementDescription(item: PurchaseRequestItem): string {
    const detail = item.ppmp_item_detail;
    const parent = item.ppmp_item;
    const description = detail?.item_description?.trim() ?? '';
    const specification = detail?.size_specification?.trim() ?? '';

    if (description && specification) {
        return `${description} — ${specification}`;
    }

    return (
        description ||
        specification ||
        parent?.description_objective ||
        item.item_description ||
        '—'
    );
}

function ReadonlyField({
    label,
    value,
    className = '',
}: {
    label: string;
    value: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`border-b border-r border-border px-4 py-4 ${className}`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {label}
            </div>
            <div className="mt-1.5 break-words text-sm font-semibold text-foreground">
                {value}
            </div>
        </div>
    );
}


export default function PurchaseRequestShow({
    purchaseRequest,
    can,
    flash,
}: ShowProps) {
    const [activeTab, setActiveTab] = useState<ShowTab>('information');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnRemarks, setReturnRemarks] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approvedFile, setApprovedFile] = useState<File | null>(null);
    const [actionProcessing, setActionProcessing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Purchase Requests',
            href: '/purchase-requests',
        },
        {
            title: purchaseRequest.pr_no,
            href: `/purchase-requests/${purchaseRequest.id}`,
        },
    ];

    const ppmpVersion =
        purchaseRequest.ppmp.plan_type === 'indicative' &&
        purchaseRequest.ppmp.indicative_no
            ? `Indicative No. ${purchaseRequest.ppmp.indicative_no}`
            : formatPlanType(purchaseRequest.ppmp.plan_type);

    const approvedAttachment = purchaseRequest.attachments.find(
        (att) => att.document_type === 'approved_pr'
    );

    const hasWorkflowAction =
        can.submit ||
        can.resubmit ||
        can.return ||
        can.approve;

    function handleSubmitPr() {
        const confirmed = window.confirm(
            'Submit this Purchase Request for GSPS review? It will be locked while under review.'
        );
        if (!confirmed) return;

        router.patch(
            `/purchase-requests/${purchaseRequest.id}/submit`,
            {},
            {
                preserveScroll: true,
                onStart: () => {
                    setActionProcessing(true);
                    setActionError(null);
                },
                onFinish: () => setActionProcessing(false),
                onError: (errs) => {
                    const first = Object.values(errs)[0];
                    setActionError(typeof first === 'string' ? first : 'Submission failed.');
                },
            }
        );
    }

    function handleResubmitPr() {
        const confirmed = window.confirm(
            'Resubmit the revised Purchase Request for GSPS review?'
        );
        if (!confirmed) return;

        router.patch(
            `/purchase-requests/${purchaseRequest.id}/resubmit`,
            {},
            {
                preserveScroll: true,
                onStart: () => {
                    setActionProcessing(true);
                    setActionError(null);
                },
                onFinish: () => setActionProcessing(false),
                onError: (errs) => {
                    const first = Object.values(errs)[0];
                    setActionError(typeof first === 'string' ? first : 'Resubmission failed.');
                },
            }
        );
    }

    function handleReturnPr(event: FormEvent) {
        event.preventDefault();
        if (!returnRemarks.trim()) {
            setActionError('Please provide the reason for returning the Purchase Request.');
            return;
        }

        router.patch(
            `/purchase-requests/${purchaseRequest.id}/return-for-revision`,
            { remarks: returnRemarks },
            {
                preserveScroll: true,
                onStart: () => {
                    setActionProcessing(true);
                    setActionError(null);
                },
                onFinish: () => setActionProcessing(false),
                onSuccess: () => {
                    setShowReturnModal(false);
                    setReturnRemarks('');
                },
                onError: (errs) => {
                    const first = errs.remarks || Object.values(errs)[0];
                    setActionError(typeof first === 'string' ? first : 'Return action failed.');
                },
            }
        );
    }

    function handleApprovePr(event: FormEvent) {
        event.preventDefault();
        if (!approvedFile) {
            setActionError('Please select the scanned approved Purchase Request file.');
            return;
        }

        router.post(
            `/purchase-requests/${purchaseRequest.id}/approve`,
            { approved_pr: approvedFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setActionProcessing(true);
                    setActionError(null);
                },
                onFinish: () => setActionProcessing(false),
                onSuccess: () => {
                    setShowApproveModal(false);
                    setApprovedFile(null);
                },
                onError: (errs) => {
                    const first = errs.approved_pr || Object.values(errs)[0];
                    setActionError(typeof first === 'string' ? first : 'Approval failed.');
                },
            }
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={purchaseRequest.pr_no} />

            <div className="pms-page bg-background">
                <PageHeader
                    eyebrow="Purchase Request"
                    title={purchaseRequest.pr_no}
                    description="GAM Appendix 60 Purchase Request linked to its exact historical PPMP version and Project / Requirement entries."
                    icon={FileText}
                    actions={
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/purchase-requests">
                                    <ArrowLeft className="size-4" />
                                    Back to PRs
                                </Link>
                            </Button>

                            <Button variant="outline" asChild>
                                <Link href={`/ppmps/${purchaseRequest.ppmp.id}`}>
                                    <ExternalLink className="size-4" />
                                    Source PPMP
                                </Link>
                            </Button>

                            {can.update && (
                                <Button variant="outline" asChild>
                                    <Link href={`/purchase-requests/${purchaseRequest.id}/edit`}>
                                        <Pencil className="size-4" />
                                        Edit PR
                                    </Link>
                                </Button>
                            )}

                            {can.submit && (
                                <Button
                                    type="button"
                                    onClick={handleSubmitPr}
                                    disabled={actionProcessing}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <Send className="size-4" />
                                    Submit for Review
                                </Button>
                            )}

                            {can.resubmit && (
                                <Button
                                    type="button"
                                    onClick={handleResubmitPr}
                                    disabled={actionProcessing}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <RotateCcw className="size-4" />
                                    Resubmit for Review
                                </Button>
                            )}

                            {can.return && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setActionError(null);
                                        setShowReturnModal(true);
                                    }}
                                    className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                                >
                                    <RotateCcw className="size-4" />
                                    Return for Revision
                                </Button>
                            )}

                            {can.approve && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setActionError(null);
                                        setShowApproveModal(true);
                                    }}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <CheckCircle2 className="size-4" />
                                    Approve PR
                                </Button>
                            )}
                        </div>
                    }
                />

                {flash.success && (
                    <div className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        {flash.success}
                    </div>
                )}

                {actionError && (
                    <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                        {actionError}
                    </div>
                )}

                {/* RETURNED FOR REVISION ALERT */}
                {purchaseRequest.status === 'returned_for_revision' && purchaseRequest.remarks && (
                    <div className="border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                    Purchase Request Returned for Revision
                                </h3>
                                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                                    {purchaseRequest.remarks}
                                </p>
                                {can.update && (
                                    <div className="mt-3">
                                        <Button size="sm" asChild>
                                            <Link href={`/purchase-requests/${purchaseRequest.id}/edit`}>
                                                <Pencil className="size-3.5" />
                                                Edit PR to Address Remarks
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* APPROVED STATUS BANNER */}
                {purchaseRequest.status === 'approved' && (
                    <div className="border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                        Approved Purchase Request & Budget Locked
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        Recorded by {purchaseRequest.approval_recorder?.name ?? 'GSPS'} on{' '}
                                        {purchaseRequest.approved_at ?? '—'}.
                                    </p>
                                </div>
                            </div>

                            {approvedAttachment && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`/purchase-requests/${purchaseRequest.id}/attachments/${approvedAttachment.id}/download`}
                                    >
                                        <Download className="size-3.5" />
                                        Download Approved Scanned Copy
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <div className="mx-auto w-full max-w-[1680px] p-4 md:p-6">
                    <section className="border border-border bg-card">
                        {/* SUMMARY STRIP */}
                        <div className="grid border-b border-border bg-secondary/25 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">PR No.</div>
                                <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                    {purchaseRequest.pr_no}
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">Status</div>
                                <div className="mt-1">
                                    <StatusBadge status={purchaseRequest.status} />
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="pms-readonly-label">PR Date</div>
                                <div className="mt-1 text-sm font-bold">
                                    {formatDate(purchaseRequest.pr_date)}
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">Office</div>
                                <div className="mt-1 text-sm font-bold">
                                    {purchaseRequest.office.code}
                                </div>
                            </div>

                            <div className="px-4 py-3">
                                <div className="pms-readonly-label">Total Amount</div>
                                <div className="mt-1 font-bold tabular-nums text-primary">
                                    {formatCurrency(purchaseRequest.total_amount)}
                                </div>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-5">
                            {/* Section 01 — Information */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('information')}
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left border-r ${
                                    activeTab === 'information'
                                        ? 'border-b-blue-600 bg-blue-50/60 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                                        : 'border-b-transparent bg-card hover:bg-secondary/30'
                                }`}
                            >
                                <div className="flex size-8 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30">
                                    <Info className="size-4" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 01
                                    </div>
                                    <div className="mt-0.5 text-sm font-bold">
                                        Information
                                    </div>
                                </div>
                            </button>

                            {/* Section 02 — Items */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('items')}
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left border-r ${
                                    activeTab === 'items'
                                        ? 'border-b-emerald-600 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                        : 'border-b-transparent bg-card hover:bg-secondary/30'
                                }`}
                            >
                                <div className="flex size-8 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30">
                                    <ClipboardList className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 02
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2 text-sm font-bold">
                                        Items
                                        <span className="text-emerald-600">
                                            {purchaseRequest.items.length}
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {/* Section 03 — Signatories */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('signatories')}
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left border-r ${
                                    activeTab === 'signatories'
                                        ? 'border-b-violet-600 bg-violet-50/60 text-violet-800 dark:bg-violet-950/20 dark:text-violet-300'
                                        : 'border-b-transparent bg-card hover:bg-secondary/30'
                                }`}
                            >
                                <div className="flex size-8 items-center justify-center border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/30">
                                    <UsersRound className="size-4" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 03
                                    </div>
                                    <div className="mt-0.5 text-sm font-bold">
                                        Signatories
                                    </div>
                                </div>
                            </button>

                            {/* Section 04 — Attachments */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('attachments')}
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left border-r ${
                                    activeTab === 'attachments'
                                        ? 'border-b-sky-600 bg-sky-50/60 text-sky-800 dark:bg-sky-950/20 dark:text-sky-300'
                                        : 'border-b-transparent bg-card hover:bg-secondary/30'
                                }`}
                            >
                                <div className="flex size-8 items-center justify-center border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900 dark:bg-sky-950/30">
                                    <Paperclip className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 04
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2 text-sm font-bold">
                                        Attachments
                                        <span className="text-sky-600">
                                            {purchaseRequest.attachments?.length ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {/* Section 05 — History */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left ${
                                    activeTab === 'history'
                                        ? 'border-b-amber-600 bg-amber-50/60 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                                        : 'border-b-transparent bg-card hover:bg-secondary/30'
                                }`}
                            >
                                <div className="flex size-8 items-center justify-center border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/30">
                                    <History className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 05
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-2 text-sm font-bold">
                                        History
                                        <span className="text-amber-600">
                                            {purchaseRequest.status_histories?.length ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="min-h-[450px]">

                    {/* TAB 1: INFORMATION */}
                    {activeTab === 'information' && (
                        <div>
                            {/* WORKFLOW */}
                            <div className="grid border-b border-border xl:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="border-b border-border bg-blue-50/30 px-5 py-4 xl:border-b-0 xl:border-r dark:bg-blue-950/10">
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30">
                                            <Info className="size-4" />
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                Current Workflow (Status)
                                            </div>

                                            <div className="mt-1">
                                                <StatusBadge
                                                    status={
                                                        purchaseRequest.status
                                                    }
                                                />
                                            </div>

                                            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                                                {workflowDescription(
                                                    purchaseRequest.status,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                                    {can.submit && (
                                        <Button
                                            type="button"
                                            disabled={actionProcessing}
                                            onClick={handleSubmitPr}
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <Send className="size-4" />
                                            Submit for Review
                                        </Button>
                                    )}

                                    {can.resubmit && (
                                        <Button
                                            type="button"
                                            disabled={actionProcessing}
                                            onClick={handleResubmitPr}
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <RotateCcw className="size-4" />
                                            Resubmit for Review
                                        </Button>
                                    )}

                                    {can.return && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={actionProcessing}
                                            onClick={() => {
                                                setActionError(null);
                                                setShowReturnModal(true);
                                            }}
                                            className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                                        >
                                            <RotateCcw className="size-4" />
                                            Return for Revision
                                        </Button>
                                    )}

                                    {can.approve && (
                                        <Button
                                            type="button"
                                            disabled={actionProcessing}
                                            onClick={() => {
                                                setActionError(null);
                                                setShowApproveModal(true);
                                            }}
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Approve PR
                                        </Button>
                                    )}

                                    {!hasWorkflowAction && (
                                        <span className="text-xs text-muted-foreground">
                                            No workflow action is currently required from your account.
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="border-b border-border bg-blue-50/35 px-5 py-4 dark:bg-blue-950/10">
                                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700 dark:text-blue-300">
                                    Purchase Request Information
                                </div>
                                <h2 className="mt-1 text-base font-bold">PR and Source PPMP</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Read-only information recorded for this Purchase Request.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 xl:grid-cols-4">
                                <ReadonlyField
                                    label="Entity Name"
                                    value={purchaseRequest.entity_name || '—'}
                                />
                                <ReadonlyField
                                    label="Fund Cluster"
                                    value={purchaseRequest.fund_cluster || '—'}
                                />
                                <ReadonlyField
                                    label="Responsibility Center"
                                    value={purchaseRequest.responsibility_center_code || '—'}
                                />
                                <ReadonlyField
                                    label="Source PPMP"
                                    value={
                                        <div>
                                            <Link
                                                href={`/ppmps/${purchaseRequest.ppmp.id}`}
                                                className="font-bold text-primary hover:underline"
                                            >
                                                {purchaseRequest.ppmp.ppmp_no}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {ppmpVersion} (FY {purchaseRequest.ppmp.fiscal_year})
                                            </div>
                                        </div>
                                    }
                                />
                                <ReadonlyField
                                    label="Office / Division"
                                    value={`${purchaseRequest.office.code} — ${purchaseRequest.office.name}`}
                                />
                                <ReadonlyField
                                    label="Prepared By"
                                    value={purchaseRequest.requester.name}
                                />
                                <ReadonlyField
                                    label="Created At"
                                    value={purchaseRequest.created_at || '—'}
                                />
                                <ReadonlyField
                                    label="Last Updated"
                                    value={purchaseRequest.updated_at || '—'}
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ITEMS */}
                    {activeTab === 'items' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-border bg-secondary/50 font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="p-3">#</th>
                                        <th className="p-3">Requirement Link</th>
                                        <th className="p-3">Property No.</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3 text-right">Quantity</th>
                                        <th className="p-3">Unit</th>
                                        <th className="p-3 text-right">Unit Cost</th>
                                        <th className="p-3 text-right">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {purchaseRequest.items.map((item, index) => {
                                        const plannedQty = item.ppmp_item_detail?.quantity
                                            ? Number(item.ppmp_item_detail.quantity)
                                            : null;
                                        const itemQty = Number(item.quantity);
                                        const qtyExceeded =
                                            plannedQty !== null && plannedQty > 0 && itemQty > plannedQty;

                                        return (
                                            <tr key={item.id} className="hover:bg-secondary/20">
                                                <td className="p-3 font-semibold text-muted-foreground">
                                                    {index + 1}
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-bold text-primary">
                                                        {requirementLabel(item)}
                                                    </span>
                                                    <div className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                                                        {requirementDescription(item)}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {item.stock_property_no || '—'}
                                                </td>
                                                <td className="p-3 max-w-[300px]">
                                                    <div className="font-medium text-foreground">
                                                        {item.item_description || '—'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-mono font-semibold">
                                                    <div>{formatQuantity(item.quantity)}</div>
                                                    {qtyExceeded && (
                                                        <span
                                                            className="inline-flex items-center gap-0.5 font-sans text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                                                            title={`Exceeds planned PPMP quantity (${plannedQty} ${item.ppmp_item_detail?.unit || ''})`}
                                                        >
                                                            <AlertTriangle className="size-2.5 shrink-0" />
                                                            <span>&gt; PPMP ({plannedQty})</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {item.unit || '—'}
                                                </td>
                                                <td className="p-3 text-right font-mono font-semibold">
                                                    {formatCurrency(item.unit_cost)}
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-primary">
                                                    {formatCurrency(item.total_cost)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-border bg-secondary/30 font-bold">
                                    <tr>
                                        <td colSpan={7} className="p-3 text-right text-xs uppercase tracking-wider">
                                            Total Purchase Request Amount:
                                        </td>
                                        <td className="p-3 text-right text-base font-mono font-bold text-primary">
                                            {formatCurrency(purchaseRequest.total_amount)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    {/* TAB 3: SIGNATORIES */}
                    {activeTab === 'signatories' && (
                        <div className="p-6 space-y-6">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                    Purpose
                                </div>
                                <div className="mt-1.5 whitespace-pre-wrap border border-border bg-secondary/10 p-4 text-sm font-medium">
                                    {purchaseRequest.purpose || 'No purpose specified.'}
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2 pt-4">
                                <div className="border border-border p-4 bg-secondary/10">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Requested By
                                    </div>
                                    <div className="mt-2 text-base font-bold text-foreground">
                                        {purchaseRequest.requested_by_name || '—'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {purchaseRequest.requested_by_designation || 'Division Chief / Head'}
                                    </div>
                                </div>

                                <div className="border border-border p-4 bg-secondary/10">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Approved By
                                    </div>
                                    <div className="mt-2 text-base font-bold text-foreground">
                                        {purchaseRequest.approved_by_name || '—'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {purchaseRequest.approved_by_designation || 'Director'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: ATTACHMENTS */}
                    {activeTab === 'attachments' && (
                        <div className="p-6 space-y-4">
                            <div className="border-b border-border pb-3">
                                <h3 className="text-sm font-bold">Purchase Request Documents</h3>
                                <p className="text-xs text-muted-foreground">
                                    Official scanned copies and supporting documents uploaded for this PR.
                                </p>
                            </div>

                            {(!purchaseRequest.attachments || purchaseRequest.attachments.length === 0) ? (
                                <div className="border border-dashed border-border bg-secondary/20 p-6 text-center text-xs text-muted-foreground">
                                    No attachments uploaded yet. Scanned approved copy is uploaded upon approval.
                                </div>
                            ) : (
                                <div className="divide-y divide-border border border-border">
                                    {purchaseRequest.attachments.map((attachment) => (
                                        <div key={attachment.id} className="flex items-center justify-between p-4 bg-card">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30">
                                                    <Paperclip className="size-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground">
                                                        {attachment.original_name}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {formatBytes(attachment.file_size)} • Uploaded by {attachment.uploaded_by} on {attachment.created_at}
                                                    </div>
                                                </div>
                                            </div>

                                            <Button variant="outline" size="sm" asChild>
                                                <a
                                                    href={`/purchase-requests/${purchaseRequest.id}/attachments/${attachment.id}/download`}
                                                >
                                                    <Download className="size-3.5" />
                                                    Download
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: HISTORY */}
                    {activeTab === 'history' && (
                        <div className="p-6 space-y-4">
                            <div className="border-b border-border pb-3">
                                <h3 className="text-sm font-bold">Status History Log</h3>
                                <p className="text-xs text-muted-foreground">
                                    Chronological trail of state transitions, acting personnel, and revision remarks.
                                </p>
                            </div>

                            {(!purchaseRequest.status_histories || purchaseRequest.status_histories.length === 0) ? (
                                <div className="border border-dashed border-border bg-secondary/20 p-6 text-center text-xs text-muted-foreground">
                                    No status history entries found.
                                </div>
                            ) : (
                                <div className="divide-y divide-border border border-border">
                                    {purchaseRequest.status_histories.map((item) => (
                                        <div key={item.id} className="p-4 bg-card">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-foreground">
                                                        {formatAction(item.action)}
                                                    </span>
                                                    <StatusBadge status={item.to_status} />
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {item.acted_at}
                                                </div>
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Acted by: <strong className="text-foreground">{item.action_by}</strong>
                                            </div>

                                            {item.remarks && (
                                                <div className="mt-2 border-l-2 border-amber-500 bg-amber-50/50 p-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                                                    {item.remarks}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                        </div>{/* min-h-[450px] */}
                    </section>
                </div>{/* max-w container */}

                {/* RETURN FOR REVISION MODAL */}
                {showReturnModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                        <form onSubmit={handleReturnPr} className="w-full max-w-lg border border-border bg-card shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
                                <h3 className="text-base font-bold text-foreground">
                                    Return Purchase Request for Revision
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowReturnModal(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {actionError && (
                                    <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                                        {actionError}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    Please provide specific remarks explaining why this Purchase Request is being returned so the requester can revise it.
                                </p>

                                <div>
                                    <Label htmlFor="return_remarks">
                                        Return Remarks <span className="text-red-500">*</span>
                                    </Label>
                                    <textarea
                                        id="return_remarks"
                                        rows={4}
                                        value={returnRemarks}
                                        onChange={(e) => setReturnRemarks(e.target.value)}
                                        className="mt-1.5 block w-full rounded-none border border-input bg-background p-3 text-xs focus:border-primary focus:outline-none"
                                        placeholder="Explain the required corrections or missing documents..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowReturnModal(false)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={actionProcessing}
                                    className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    {actionProcessing ? 'Returning...' : 'Confirm Return for Revision'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* APPROVE MODAL */}
                {showApproveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                        <form onSubmit={handleApprovePr} className="w-full max-w-lg border border-border bg-card shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
                                <h3 className="text-base font-bold text-foreground">
                                    Approve Purchase Request
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowApproveModal(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {actionError && (
                                    <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                                        {actionError}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    Approving this Purchase Request will lock its items and permanently deduct{' '}
                                    <strong className="text-primary">{formatCurrency(purchaseRequest.total_amount)}</strong> from the PPMP's available budget.
                                </p>

                                <div>
                                    <Label htmlFor="approved_pr_file">
                                        Upload Scanned Approved Copy <span className="text-red-500">*</span>
                                    </Label>
                                    <input
                                        id="approved_pr_file"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setApprovedFile(e.target.files?.[0] ?? null)}
                                        className="mt-1.5 block w-full text-xs file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                                        required
                                    />
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        Accepted formats: PDF, JPG, PNG up to 20MB.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowApproveModal(false)}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={actionProcessing || !approvedFile}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {actionProcessing ? 'Approving...' : 'Confirm Approval & Lock Budget'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
