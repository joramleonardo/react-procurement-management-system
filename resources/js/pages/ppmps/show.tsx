import { DataTableShell } from '@/components/pms/data-table-shell';
import { EmptyState } from '@/components/pms/empty-state';
import { PageHeader } from '@/components/pms/page-header';
import { StatusBadge } from '@/components/pms/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarRange,
    CheckCircle2,
    ChevronRight,
    // CircleDollarSign,
    ClipboardList,
    Download,
    FileText,
    History,
    Info,
    Pencil,
    Plus,
    Upload,
    UsersRound,
    X,
} from 'lucide-react';
import {
    type FormEvent,
    useState,
} from 'react';

interface Office {
    id: number;
    code: string;
    name: string;
}

interface Coordinator {
    id: number;
    name: string;
    position_title: string | null;
}

interface Attachment {
    id: number;
    original_name: string;
    file_size: number | null;
}

interface PpmpItem {
    id: number;

    description_objective: string;
    project_type: string;
    quantity_size: string;

    recommended_mode_of_procurement: string;

    pre_procurement_conference: boolean;

    procurement_start_month: string;
    procurement_end_month: string;
    expected_delivery_month: string;

    source_of_funds: string;

    estimated_budget: string;

    remarks: string | null;

    attachments: Attachment[];
}

interface StatusHistory {
    id: number;

    from_status: string | null;
    to_status: string;

    action: string;

    remarks: string | null;

    action_by: string | null;
    acted_at: string | null;
}

interface Approver {
    id: number;
    name: string;
}

interface RevisedFrom {
    id: number;
    ppmp_no: string;
    indicative_no: number;
}

interface PpmpVersion {
    id: number;
    ppmp_no: string;

    plan_type: string;
    indicative_no: number | null;
    version_label: string;

    status: string;
    total_budget: string;

    revised_from_ppmp_id: number | null;

    approved_at: string | null;
    created_at: string | null;

    is_current: boolean;
}

interface Ppmp {
    id: number;
    ppmp_series_id: number;
    ppmp_no: string;

    fiscal_year: number;
    plan_type: string;
    indicative_no: number;
    version_label: string;

    status: string;

    total_budget: string;
    original_budget: string | null;
    series_approved_pr_total: string | null;

    revised_from: RevisedFrom | null;
    versions: PpmpVersion[];

    prepared_by_name: string | null;
    prepared_by_position: string | null;

    submitted_by_name: string | null;
    submitted_by_position: string | null;

    office: Office;
    coordinator: Coordinator;

    items: PpmpItem[];
    histories: StatusHistory[];

    remarks: string | null;

    submitted_at: string | null;
    returned_at: string | null;
    approved_at: string | null;

    approver: Approver | null;

    approved_copy: Attachment | null;
}

interface ShowProps {
    ppmp: Ppmp;

    can: {
        edit: boolean;
        submit: boolean;
        resubmit: boolean;
        return_for_revision: boolean;
        approve: boolean;
        create_pr: boolean;
        create_revision: boolean;
    };

    flash: {
        success: string | null;
    };
}

type ShowTab =
    | 'information'
    | 'items'
    | 'signatories';

interface ItemAttachmentsProps {
    ppmpId: number;
    item: PpmpItem;
    canEdit: boolean;
}

function formatCurrency(
    value: string | number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',

            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    ).format(
        Number(value),
    );
}

function formatMonth(
    value: string | null,
): string {
    if (!value) {
        return '—';
    }

    const [
        year,
        month,
    ] =
        value.split('-');

    if (
        !year ||
        !month
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            month: 'short',
            year: 'numeric',
        },
    ).format(
        new Date(
            Number(year),
            Number(month) - 1,
            1,
        ),
    );
}

function formatAction(
    action: string,
): string {
    const actions:
        Record<string, string> = {
        create:
            'Created',

        create_revision:
            'Created Indicative Revision',

        submit:
            'Submitted for Review',

        resubmit:
            'Resubmitted for Review',

        return_for_revision:
            'Returned for Revision',

        approve:
            'Approved',
    };

    return (
        actions[action] ??
        action
            .replace(/_/g, ' ')
            .replace(
                /\b\w/g,
                (letter) =>
                    letter.toUpperCase(),
            )
    );
}

function formatBytes(
    bytes: number | null,
): string {
    if (
        bytes === null ||
        bytes <= 0
    ) {
        return '';
    }

    const units = [
        'B',
        'KB',
        'MB',
        'GB',
    ];

    const index =
        Math.min(
            Math.floor(
                Math.log(bytes) /
                    Math.log(1024),
            ),
            units.length - 1,
        );

    const value =
        bytes /
        Math.pow(
            1024,
            index,
        );

    return `${value.toFixed(
        index === 0
            ? 0
            : 1,
    )} ${units[index]}`;
}

function workflowDescription(
    status: string,
): string {
    switch (status) {
        case 'submitted':
            return 'This PPMP has been submitted and is awaiting GSPS review.';

        case 'returned_for_revision':
            return 'This PPMP was returned to the coordinator and requires revision before it can be resubmitted.';

        case 'approved':
            return 'This PPMP has been approved and may now be used as the basis for Purchase Requests.';

        case 'draft':
        default:
            return 'This PPMP is currently a draft and may still be edited before submission.';
    }
}

function itemSchedule(
    item: PpmpItem,
): string {
    if (
        !item.procurement_start_month &&
        !item.procurement_end_month
    ) {
        return 'Not specified';
    }

    return `${formatMonth(
        item.procurement_start_month,
    )} – ${formatMonth(
        item.procurement_end_month,
    )}`;
}

function ItemAttachments({
    ppmpId,
    item,
    canEdit,
}: ItemAttachmentsProps) {
    const [
        file,
        setFile,
    ] =
        useState<File | null>(
            null,
        );

    const [
        uploading,
        setUploading,
    ] =
        useState(false);

    const [
        uploadError,
        setUploadError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        inputKey,
        setInputKey,
    ] =
        useState(0);

    function uploadAttachment(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!file) {
            setUploadError(
                'Please select a file.',
            );

            return;
        }

        setUploadError(
            null,
        );

        router.post(
            `/ppmps/${ppmpId}/items/${item.id}/attachments`,
            {
                attachment:
                    file,
            },
            {
                forceFormData:
                    true,

                preserveScroll:
                    true,

                onStart:
                    () => {
                        setUploading(
                            true,
                        );
                    },

                onFinish:
                    () => {
                        setUploading(
                            false,
                        );
                    },

                onSuccess:
                    () => {
                        setFile(
                            null,
                        );

                        setUploadError(
                            null,
                        );

                        setInputKey(
                            (
                                current,
                            ) =>
                                current +
                                1,
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const error =
                            errors.attachment;

                        setUploadError(
                            typeof error ===
                                'string'
                                ? error
                                : 'The file could not be uploaded.',
                        );
                    },
            },
        );
    }

    function deleteAttachment(
        attachment: Attachment,
    ) {
        const confirmed =
            window.confirm(
                `Delete "${attachment.original_name}"?`,
            );

        if (!confirmed) {
            return;
        }

        router.delete(
            `/ppmps/${ppmpId}/attachments/${attachment.id}`,
            {
                preserveScroll:
                    true,
            },
        );
    }

    return (
        <div className="space-y-3">
            {item.attachments.length >
            0 ? (
                <div className="divide-y divide-border border border-border">
                    {item.attachments.map(
                        (
                            attachment,
                        ) => (
                            <div
                                key={
                                    attachment.id
                                }
                                className="bg-card p-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-400">
                                        <FileText className="size-4" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="break-all text-xs font-bold">
                                            {
                                                attachment.original_name
                                            }
                                        </div>

                                        {attachment.file_size !==
                                            null && (
                                            <div className="mt-1 text-[10px] text-muted-foreground">
                                                {formatBytes(
                                                    attachment.file_size,
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <a
                                                href={`/ppmps/${ppmpId}/attachments/${attachment.id}/download`}
                                                className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 text-[11px] font-semibold hover:bg-secondary"
                                            >
                                                <Download className="size-3.5" />

                                                Download
                                            </a>

                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteAttachment(
                                                            attachment,
                                                        )
                                                    }
                                                    className="inline-flex h-8 items-center border border-red-200 bg-background px-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            ) : (
                <div className="border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
                    No supporting documents
                    uploaded for this item.
                </div>
            )}

            {canEdit && (
                <form
                    onSubmit={
                        uploadAttachment
                    }
                    className="border border-dashed border-sky-300 bg-sky-50/30 p-3 dark:border-sky-900 dark:bg-sky-950/10"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <Upload className="size-4 text-sky-600" />

                        <div className="text-xs font-bold text-sky-700 dark:text-sky-300">
                            Upload Supporting Document
                        </div>
                    </div>

                    <input
                        key={
                            inputKey
                        }
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        onChange={(
                            event,
                        ) => {
                            setFile(
                                event
                                    .target
                                    .files?.[0] ??
                                    null,
                            );

                            setUploadError(
                                null,
                            );
                        }}
                        className="block w-full text-xs file:mr-2 file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
                    />

                    <div className="mt-2 text-[10px] leading-4 text-muted-foreground">
                        PDF, Word, Excel,
                        JPG or PNG; maximum
                        20 MB.
                    </div>

                    {uploadError && (
                        <p className="mt-2 text-xs text-red-600">
                            {
                                uploadError
                            }
                        </p>
                    )}

                    <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={
                            uploading ||
                            !file
                        }
                        className="mt-3 w-full"
                    >
                        <Upload className="size-3.5" />

                        {uploading
                            ? 'Uploading...'
                            : 'Upload Document'}
                    </Button>
                </form>
            )}
        </div>
    );
}

export default function ShowPpmp({
    ppmp,
    can,
    flash,
}: ShowProps) {
    const breadcrumbs:
        BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'PPMP',
            href: '/ppmps',
        },
        {
            title:
                ppmp.ppmp_no,
            href: `/ppmps/${ppmp.id}`,
        },
    ];

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<ShowTab>(
            'information',
        );

    const [
        selectedItem,
        setSelectedItem,
    ] =
        useState<PpmpItem | null>(
            null,
        );

    const [
        returnRemarks,
        setReturnRemarks,
    ] =
        useState('');

    const [
        showReturnForm,
        setShowReturnForm,
    ] =
        useState(false);

    const [
        approvedFile,
        setApprovedFile,
    ] =
        useState<File | null>(
            null,
        );

    const [
        showApproveForm,
        setShowApproveForm,
    ] =
        useState(false);

    const [
        workflowProcessing,
        setWorkflowProcessing,
    ] =
        useState(false);

    const [
        workflowError,
        setWorkflowError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        revisionProcessing,
        setRevisionProcessing,
    ] =
        useState(false);

    const [
        revisionError,
        setRevisionError,
    ] =
        useState<string | null>(
            null,
        );

    const originalPpmp =
        ppmp.versions.find(
            (version) =>
                version.plan_type ===
                    'indicative' &&
                version.indicative_no ===
                    1,
        ) ?? null;

    const hasWorkflowAction =
        can.submit ||
        can.resubmit ||
        can.return_for_revision ||
        can.approve;

    function createIndicativeRevision() {
        const nextIndicativeNo =
            ppmp.indicative_no +
            1;

        const confirmed =
            window.confirm(
                `Create Indicative No. ${nextIndicativeNo} from ${ppmp.ppmp_no}? The approved current version will remain unchanged and a new Draft revision will be created.`,
            );

        if (!confirmed) {
            return;
        }

        router.post(
            `/ppmps/${ppmp.id}/revisions`,
            {},
            {
                preserveScroll:
                    true,

                onStart:
                    () => {
                        setRevisionProcessing(
                            true,
                        );

                        setRevisionError(
                            null,
                        );
                    },

                onFinish:
                    () => {
                        setRevisionProcessing(
                            false,
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const error =
                            errors.revision ??
                            Object.values(
                                errors,
                            )[0];

                        setRevisionError(
                            typeof error ===
                                'string'
                                ? error
                                : 'The new Indicative revision could not be created.',
                        );
                    },
            },
        );
    }

    function submitPpmp() {
        const confirmed =
            window.confirm(
                'Submit this PPMP for review? You will not be able to edit it while it is under review.',
            );

        if (!confirmed) {
            return;
        }

        router.patch(
            `/ppmps/${ppmp.id}/submit`,
            {},
            {
                preserveScroll:
                    true,

                onStart:
                    () => {
                        setWorkflowProcessing(
                            true,
                        );

                        setWorkflowError(
                            null,
                        );
                    },

                onFinish:
                    () => {
                        setWorkflowProcessing(
                            false,
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const firstError =
                            Object.values(
                                errors,
                            )[0];

                        setWorkflowError(
                            typeof firstError ===
                                'string'
                                ? firstError
                                : 'The PPMP could not be submitted.',
                        );
                    },
            },
        );
    }

    function resubmitPpmp() {
        const confirmed =
            window.confirm(
                'Resubmit the revised PPMP for review?',
            );

        if (!confirmed) {
            return;
        }

        router.patch(
            `/ppmps/${ppmp.id}/resubmit`,
            {},
            {
                preserveScroll:
                    true,

                onStart:
                    () => {
                        setWorkflowProcessing(
                            true,
                        );

                        setWorkflowError(
                            null,
                        );
                    },

                onFinish:
                    () => {
                        setWorkflowProcessing(
                            false,
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const firstError =
                            Object.values(
                                errors,
                            )[0];

                        setWorkflowError(
                            typeof firstError ===
                                'string'
                                ? firstError
                                : 'The PPMP could not be resubmitted.',
                        );
                    },
            },
        );
    }

    function returnForRevision(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (
            !returnRemarks.trim()
        ) {
            setWorkflowError(
                'Please provide the reason for returning the PPMP.',
            );

            return;
        }

        router.patch(
            `/ppmps/${ppmp.id}/return-for-revision`,
            {
                remarks:
                    returnRemarks,
            },
            {
                preserveScroll:
                    true,

                onStart:
                    () => {
                        setWorkflowProcessing(
                            true,
                        );

                        setWorkflowError(
                            null,
                        );
                    },

                onFinish:
                    () => {
                        setWorkflowProcessing(
                            false,
                        );
                    },

                onSuccess:
                    () => {
                        setShowReturnForm(
                            false,
                        );

                        setReturnRemarks(
                            '',
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const error =
                            errors.remarks ??
                            errors.workflow;

                        setWorkflowError(
                            typeof error ===
                                'string'
                                ? error
                                : 'The PPMP could not be returned.',
                        );
                    },
            },
        );
    }

    function approvePpmp(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!approvedFile) {
            setWorkflowError(
                'Please select the scanned approved PPMP.',
            );

            return;
        }

        router.post(
            `/ppmps/${ppmp.id}/approve`,
            {
                approved_ppmp:
                    approvedFile,
            },
            {
                forceFormData:
                    true,

                preserveScroll:
                    true,

                onStart:
                    () => {
                        setWorkflowProcessing(
                            true,
                        );

                        setWorkflowError(
                            null,
                        );
                    },

                onFinish:
                    () => {
                        setWorkflowProcessing(
                            false,
                        );
                    },

                onSuccess:
                    () => {
                        setShowApproveForm(
                            false,
                        );

                        setApprovedFile(
                            null,
                        );
                    },

                onError:
                    (
                        errors,
                    ) => {
                        const error =
                            errors.approved_ppmp ??
                            errors.workflow;

                        setWorkflowError(
                            typeof error ===
                                'string'
                                ? error
                                : 'The PPMP could not be approved.',
                        );
                    },
            },
        );
    }

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head
                title={
                    ppmp.ppmp_no
                }
            />

            <div className="pms-page bg-background">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Planning"
                    title={
                        ppmp.ppmp_no
                    }
                    description="Project Procurement Management Plan"
                    icon={
                        FileText
                    }
                    actions={
                        <>
                            <Button
                                variant="outline"
                                asChild
                            >
                                <Link href="/ppmps">
                                    <ArrowLeft className="size-4" />

                                    Back
                                </Link>
                            </Button>

                            {can.edit && (
                                <Button
                                    variant="outline"
                                    asChild
                                >
                                    <Link
                                        href={`/ppmps/${ppmp.id}/edit`}
                                    >
                                        <Pencil className="size-4" />

                                        Edit PPMP
                                    </Link>
                                </Button>
                            )}

                            {can.create_revision && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        revisionProcessing
                                    }
                                    onClick={
                                        createIndicativeRevision
                                    }
                                >
                                    <Plus className="size-4" />

                                    {revisionProcessing
                                        ? 'Creating...'
                                        : `Create Indicative No. ${ppmp.indicative_no + 1}`}
                                </Button>
                            )}

                            {can.create_pr && (
                                <Button
                                    asChild
                                >
                                    <Link
                                        href={`/ppmps/${ppmp.id}/purchase-requests/create`}
                                    >
                                        <Plus className="size-4" />

                                        Create PR
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                {/* SUCCESS */}
                {flash.success && (
                    <div className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800 md:px-6 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
                        {
                            flash.success
                        }
                    </div>
                )}

                {revisionError && (
                    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 md:px-6 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                        {
                            revisionError
                        }
                    </div>
                )}

                <div className="mx-auto w-full max-w-[1680px] p-4 md:p-6">
                    <section className="border border-border bg-card">
                        {/* SUMMARY STRIP */}
                        <div className="grid border-b border-border bg-secondary/25 sm:grid-cols-2 xl:grid-cols-7">
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">
                                    PPMP No.
                                </div>

                                <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                    {
                                        ppmp.ppmp_no
                                    }
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="pms-readonly-label">
                                    Status
                                </div>

                                <div className="mt-1">
                                    <StatusBadge
                                        status={
                                            ppmp.status
                                        }
                                    />
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">
                                    Fiscal Year
                                </div>

                                <div className="mt-1 text-sm font-bold">
                                    {
                                        ppmp.fiscal_year
                                    }
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="pms-readonly-label">
                                    PPMP Type
                                </div>

                                <div className="mt-1 text-sm font-bold capitalize">
                                    {
                                        ppmp.plan_type
                                    }
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="pms-readonly-label">
                                    Indicative No.
                                </div>

                                <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {
                                        ppmp.indicative_no
                                    }
                                </div>
                            </div>

                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="pms-readonly-label">
                                    Items
                                </div>

                                <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {
                                        ppmp.items
                                            .length
                                    }
                                </div>
                            </div>

                            <div className="px-4 py-3">
                                <div className="pms-readonly-label">
                                    Total Budget
                                </div>

                                <div className="mt-1 font-bold tabular-nums text-primary">
                                    {formatCurrency(
                                        ppmp.total_budget,
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="grid border-b border-border sm:grid-cols-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab(
                                        'information',
                                    )
                                }
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left sm:border-r ${
                                    activeTab ===
                                    'information'
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
                                        PPMP Information
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab(
                                        'items',
                                    )
                                }
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left sm:border-r ${
                                    activeTab ===
                                    'items'
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
                                        Procurement Items

                                        <span className="text-emerald-600">
                                            {
                                                ppmp.items
                                                    .length
                                            }
                                        </span>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab(
                                        'signatories',
                                    )
                                }
                                className={`flex min-h-[64px] items-center gap-3 border-b-[3px] px-5 text-left ${
                                    activeTab ===
                                    'signatories'
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
                        </div>

                        {/* TAB CONTENT */}
                        <div className="min-h-[450px]">
                            {/* INFORMATION */}
                            {activeTab ===
                                'information' && (
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
                                                        Current Workflow
                                                    </div>

                                                    <div className="mt-1">
                                                        <StatusBadge
                                                            status={
                                                                ppmp.status
                                                            }
                                                        />
                                                    </div>

                                                    <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                                                        {workflowDescription(
                                                            ppmp.status,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                                            {can.submit && (
                                                <Button
                                                    type="button"
                                                    disabled={
                                                        workflowProcessing
                                                    }
                                                    onClick={
                                                        submitPpmp
                                                    }
                                                >
                                                    Submit for Review
                                                </Button>
                                            )}

                                            {can.resubmit && (
                                                <Button
                                                    type="button"
                                                    disabled={
                                                        workflowProcessing
                                                    }
                                                    onClick={
                                                        resubmitPpmp
                                                    }
                                                >
                                                    Resubmit for Review
                                                </Button>
                                            )}

                                            {can.return_for_revision && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={
                                                        workflowProcessing
                                                    }
                                                    onClick={() => {
                                                        setShowReturnForm(
                                                            !showReturnForm,
                                                        );

                                                        setShowApproveForm(
                                                            false,
                                                        );

                                                        setWorkflowError(
                                                            null,
                                                        );
                                                    }}
                                                >
                                                    Return for Revision
                                                </Button>
                                            )}

                                            {can.approve && (
                                                <Button
                                                    type="button"
                                                    disabled={
                                                        workflowProcessing
                                                    }
                                                    onClick={() => {
                                                        setShowApproveForm(
                                                            !showApproveForm,
                                                        );

                                                        setShowReturnForm(
                                                            false,
                                                        );

                                                        setWorkflowError(
                                                            null,
                                                        );
                                                    }}
                                                >
                                                    Approve PPMP
                                                </Button>
                                            )}

                                            {!hasWorkflowAction && (
                                                <span className="text-xs text-muted-foreground">
                                                    No workflow action is currently required from your account.
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {workflowError && (
                                        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                            {
                                                workflowError
                                            }
                                        </div>
                                    )}

                                    {/* REVISION NOTICE */}
                                    {ppmp.status ===
                                        'returned_for_revision' &&
                                        ppmp.remarks && (
                                            <div className="border-b border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/20">
                                                <div className="flex gap-3">
                                                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />

                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300">
                                                            Revision Required
                                                        </div>

                                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900 dark:text-amber-200">
                                                            {
                                                                ppmp.remarks
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    {/* RETURN FORM */}
                                    {showReturnForm && (
                                        <form
                                            onSubmit={
                                                returnForRevision
                                            }
                                            className="border-b border-border bg-secondary/20 px-5 py-5"
                                        >
                                            <div className="max-w-3xl">
                                                <div className="text-sm font-bold">
                                                    Return PPMP for Revision
                                                </div>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Specify the corrections that the PPMP Coordinator must complete.
                                                </p>

                                                <textarea
                                                    value={
                                                        returnRemarks
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setReturnRemarks(
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    rows={5}
                                                    className="mt-4 w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    placeholder="Enter revision remarks..."
                                                    required
                                                />

                                                <div className="mt-3 flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setShowReturnForm(
                                                                false,
                                                            )
                                                        }
                                                    >
                                                        Cancel
                                                    </Button>

                                                    <Button
                                                        type="submit"
                                                        variant="destructive"
                                                        disabled={
                                                            workflowProcessing
                                                        }
                                                    >
                                                        {workflowProcessing
                                                            ? 'Returning...'
                                                            : 'Confirm Return'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    {/* APPROVE */}
                                    {showApproveForm && (
                                        <form
                                            onSubmit={
                                                approvePpmp
                                            }
                                            className="border-b border-border bg-secondary/20 px-5 py-5"
                                        >
                                            <div className="max-w-3xl">
                                                <div className="text-sm font-bold">
                                                    Record PPMP Approval
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Upload the scanned approved PPMP after the physical document has already been approved and signed outside the system.
                                                </p>

                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setApprovedFile(
                                                            event
                                                                .target
                                                                .files?.[0] ??
                                                                null,
                                                        )
                                                    }
                                                    className="mt-4 block w-full border border-input bg-background p-2 text-sm"
                                                />

                                                <div className="mt-3 flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowApproveForm(
                                                                false,
                                                            );

                                                            setApprovedFile(
                                                                null,
                                                            );
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>

                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            workflowProcessing ||
                                                            !approvedFile
                                                        }
                                                    >
                                                        {workflowProcessing
                                                            ? 'Approving...'
                                                            : 'Confirm Approval'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    {/* INFORMATION GRID */}
                                    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
                                        <div className="border-b border-border lg:border-b-0 lg:border-r">
                                            <div className="border-b border-border bg-blue-50/30 px-5 py-4 dark:bg-blue-950/10">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700 dark:text-blue-300">
                                                    Plan Details
                                                </div>

                                                <h2 className="mt-1 text-base font-bold">
                                                    PPMP Information
                                                </h2>
                                            </div>

                                            <div className="grid sm:grid-cols-2">
                                                <div className="border-b border-border p-5 sm:border-r">
                                                    <div className="pms-readonly-label">
                                                        Fiscal Year
                                                    </div>

                                                    <div className="mt-2 text-lg font-bold">
                                                        {
                                                            ppmp.fiscal_year
                                                        }
                                                    </div>
                                                </div>

                                                <div className="border-b border-border p-5">
                                                    <div className="pms-readonly-label">
                                                        PPMP Type and No.
                                                    </div>

                                                    <div className="mt-2 text-lg font-bold capitalize">
                                                        {ppmp.plan_type} No. {ppmp.indicative_no}
                                                    </div>
                                                </div>

                                                {/* <div className="border-b border-border bg-emerald-50/20 p-5 sm:border-r dark:bg-emerald-950/10">
                                                    <div className="pms-readonly-label">
                                                        Indicative No.
                                                    </div>

                                                    <div className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                                        {
                                                            ppmp.indicative_no
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        System-assigned Indicative version number.
                                                    </div>
                                                </div> */}

                                                <div className="border-b border-border bg-sky-50/20 p-5 dark:bg-sky-950/10">
                                                    <div className="pms-readonly-label">
                                                        Original PPMP No.
                                                    </div>

                                                    <div className="mt-2 font-bold text-blue-700 dark:text-blue-300">
                                                        {ppmp.indicative_no >
                                                            1 &&
                                                        originalPpmp ? (
                                                            <Link
                                                                href={`/ppmps/${originalPpmp.id}`}
                                                                className="hover:underline"
                                                            >
                                                                {
                                                                    originalPpmp.ppmp_no
                                                                }
                                                            </Link>
                                                        ) : (
                                                            ppmp.ppmp_no
                                                        )}
                                                    </div>

                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {ppmp.indicative_no >
                                                        1
                                                            ? 'The first PPMP record in this Indicative series.'
                                                            : 'This PPMP is the original record of the series.'}
                                                    </div>
                                                </div>

                                                {ppmp.indicative_no >
                                                    1 && (
                                                    <div className="border-b border-border bg-amber-50/20 p-5 sm:border-r dark:bg-amber-950/10">
                                                        <div className="pms-readonly-label">
                                                            Revised From
                                                        </div>

                                                        <div className="mt-2 font-bold text-amber-700 dark:text-amber-300">
                                                            {ppmp.revised_from ? (
                                                                <Link
                                                                    href={`/ppmps/${ppmp.revised_from.id}`}
                                                                    className="hover:underline"
                                                                >
                                                                    {
                                                                        ppmp
                                                                            .revised_from
                                                                            .ppmp_no
                                                                    }
                                                                </Link>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </div>

                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {ppmp.revised_from
                                                                ? `Immediate previous version: Indicative No. ${ppmp.revised_from.indicative_no}.`
                                                                : 'Previous revision information is unavailable.'}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* {ppmp.indicative_no >
                                                    1 && (
                                                    <div className="border-b border-border bg-emerald-50/20 p-5 dark:bg-emerald-950/10">
                                                        <div className="pms-readonly-label">
                                                            Original PPMP Budget
                                                        </div>

                                                        <div className="mt-2 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                            {formatCurrency(
                                                                ppmp.original_budget ??
                                                                    ppmp.total_budget,
                                                            )}
                                                        </div>

                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Permanent budget established by the approved Indicative No. 1.
                                                        </div>
                                                    </div>
                                                )} */}

                                                <div className="border-b border-border bg-blue-50/20 p-5 sm:border-r dark:bg-blue-950/10">
                                                    <div className="pms-readonly-label">
                                                        End-User Unit
                                                    </div>

                                                    <div className="mt-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                                                        {
                                                            ppmp.office.code
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {
                                                            ppmp.office.name
                                                        }
                                                    </div>
                                                </div>

                                                <div className="border-b border-border bg-violet-50/20 p-5 dark:bg-violet-950/10">
                                                    <div className="pms-readonly-label">
                                                        Coordinator
                                                    </div>

                                                    <div className="mt-2 font-bold">
                                                        {
                                                            ppmp.coordinator
                                                                .name
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {ppmp.coordinator
                                                            .position_title ??
                                                            '—'}
                                                    </div>
                                                </div>

                                                <div className="p-5 sm:col-span-2">
                                                    <div className="flex items-center gap-4 border-l-[3px] border-emerald-500 bg-emerald-50/30 px-4 py-3 dark:bg-emerald-950/10">
                                                        {/* <CircleDollarSign className="size-6 text-emerald-600" /> */}

                                                        <div>
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                                Total PPMP Budget
                                                            </div>

                                                            <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                                {formatCurrency(
                                                                    ppmp.total_budget,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* APPROVAL / PR SIDE */}
                                        <aside className="bg-secondary/10">
                                            {ppmp.status ===
                                                'approved' &&
                                                ppmp.approved_copy && (
                                                    <div className="border-b border-green-300 bg-green-50/70 p-5 dark:border-green-900 dark:bg-green-950/20">
                                                        <CheckCircle2 className="size-6 text-green-600" />

                                                        <div className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-green-800 dark:text-green-300">
                                                            Approved PPMP
                                                        </div>

                                                        <p className="mt-2 text-sm leading-6 text-green-900 dark:text-green-200">
                                                            {ppmp.approved_at
                                                                ? `Approved on ${ppmp.approved_at}`
                                                                : 'Approval recorded'}

                                                            {ppmp.approver
                                                                ? ` by ${ppmp.approver.name}`
                                                                : ''}
                                                        </p>

                                                        <div className="mt-3 text-xs font-medium">
                                                            {
                                                                ppmp.approved_copy
                                                                    .original_name
                                                            }
                                                        </div>

                                                        <a
                                                            href={`/ppmps/${ppmp.id}/attachments/${ppmp.approved_copy.id}/download`}
                                                            className="mt-4 inline-flex h-9 items-center gap-2 border border-green-500 bg-background px-3 text-xs font-bold text-green-800 hover:bg-green-100 dark:text-green-200"
                                                        >
                                                            <Download className="size-4" />

                                                            Download Approved Copy
                                                        </a>
                                                    </div>
                                                )}

                                            {can.create_pr && (
                                                <div className="border-b border-border bg-blue-50/30 p-5 dark:bg-blue-950/10">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                                                        Purchase Requests
                                                    </div>

                                                    <h3 className="mt-1 text-sm font-bold">
                                                        PPMP is eligible
                                                    </h3>

                                                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                                        An approved PPMP may now be used as the source for creating Purchase Requests.
                                                    </p>

                                                    <Button
                                                        asChild
                                                        className="mt-4 w-full"
                                                    >
                                                        <Link
                                                            href={`/ppmps/${ppmp.id}/purchase-requests/create`}
                                                        >
                                                            <Plus className="size-4" />

                                                            Create Purchase Request
                                                        </Link>
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="p-5">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Workflow Dates
                                                </div>

                                                <dl className="mt-3 space-y-3 text-xs">
                                                    <div>
                                                        <dt className="text-muted-foreground">
                                                            Submitted
                                                        </dt>

                                                        <dd className="mt-1 font-semibold">
                                                            {ppmp.submitted_at ??
                                                                '—'}
                                                        </dd>
                                                    </div>

                                                    <div>
                                                        <dt className="text-muted-foreground">
                                                            Returned
                                                        </dt>

                                                        <dd className="mt-1 font-semibold">
                                                            {ppmp.returned_at ??
                                                                '—'}
                                                        </dd>
                                                    </div>

                                                    <div>
                                                        <dt className="text-muted-foreground">
                                                            Approved
                                                        </dt>

                                                        <dd className="mt-1 font-semibold">
                                                            {ppmp.approved_at ??
                                                                '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </aside>
                                    </div>
                                </div>
                            )}

                            {/* ITEMS */}
                            {activeTab ===
                                'items' && (
                                <div>
                                    <div className="border-b border-border bg-emerald-50/35 px-5 py-4 dark:bg-emerald-950/10">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                            Procurement Items
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Projects / Activities
                                        </h2>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Select a procurement item to view all PPMP fields and supporting documents.
                                        </p>
                                    </div>

                                    {ppmp.items.length ===
                                    0 ? (
                                        <EmptyState
                                            icon={
                                                ClipboardList
                                            }
                                            title="No procurement items"
                                            description="No procurement items are recorded for this PPMP."
                                        />
                                    ) : (
                                        <>
                                            <DataTableShell>
                                                <table className="pms-table min-w-[1180px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[55px]">
                                                                #
                                                            </th>

                                                            <th className="w-[330px]">
                                                                Procurement Item
                                                            </th>

                                                            <th className="w-[150px]">
                                                                Project Type
                                                            </th>

                                                            <th className="w-[150px]">
                                                                Quantity / Size
                                                            </th>

                                                            <th className="w-[180px]">
                                                                Procurement Mode
                                                            </th>

                                                            <th className="w-[190px]">
                                                                Schedule
                                                            </th>

                                                            <th className="w-[150px]">
                                                                Source of Funds
                                                            </th>

                                                            <th className="w-[165px] text-right">
                                                                Estimated Budget
                                                            </th>

                                                            <th className="w-[100px] text-right">
                                                                Details
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {ppmp.items.map(
                                                            (
                                                                item,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={
                                                                        item.id
                                                                    }
                                                                >
                                                                    <td className="text-center text-xs font-bold text-muted-foreground">
                                                                        {index +
                                                                            1}
                                                                    </td>

                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSelectedItem(
                                                                                    item,
                                                                                )
                                                                            }
                                                                            className="text-left"
                                                                        >
                                                                            <div className="font-bold text-blue-700 hover:underline dark:text-blue-300">
                                                                                {item.description_objective ||
                                                                                    'Untitled procurement item'}
                                                                            </div>

                                                                            <div className="mt-1 text-[10px] text-muted-foreground">
                                                                                {
                                                                                    item.attachments
                                                                                        .length
                                                                                }{' '}
                                                                                supporting document
                                                                                {item.attachments
                                                                                    .length ===
                                                                                1
                                                                                    ? ''
                                                                                    : 's'}
                                                                            </div>
                                                                        </button>
                                                                    </td>

                                                                    <td>
                                                                        {item.project_type ||
                                                                            '—'}
                                                                    </td>

                                                                    <td>
                                                                        {item.quantity_size ||
                                                                            '—'}
                                                                    </td>

                                                                    <td>
                                                                        {item.recommended_mode_of_procurement ||
                                                                            '—'}
                                                                    </td>

                                                                    <td>
                                                                        <div className="flex gap-2">
                                                                            <CalendarRange className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />

                                                                            <div>
                                                                                <div className="text-xs font-medium">
                                                                                    {itemSchedule(
                                                                                        item,
                                                                                    )}
                                                                                </div>

                                                                                <div className="mt-1 text-[10px] text-muted-foreground">
                                                                                    Delivery:{' '}
                                                                                    {formatMonth(
                                                                                        item.expected_delivery_month,
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    <td>
                                                                        {item.source_of_funds ||
                                                                            '—'}
                                                                    </td>

                                                                    <td className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                                        {formatCurrency(
                                                                            item.estimated_budget,
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        <div className="flex justify-end">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    setSelectedItem(
                                                                                        item,
                                                                                    )
                                                                                }
                                                                            >
                                                                                View

                                                                                <ChevronRight className="size-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </DataTableShell>

                                            <div className="flex justify-end border-t border-border bg-secondary/20 px-5 py-4">
                                                <div className="text-right">
                                                    <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                        Total PPMP Budget
                                                    </div>

                                                    <div className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                        {formatCurrency(
                                                            ppmp.total_budget,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SIGNATORIES + HISTORY */}
                            {activeTab ===
                                'signatories' && (
                                <div>
                                    <div className="border-b border-border bg-violet-50/35 px-5 py-4 dark:bg-violet-950/10">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-violet-700 dark:text-violet-300">
                                            Signatories
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Prepared and Submitted By
                                        </h2>
                                    </div>

                                    <div className="grid border-b border-border md:grid-cols-2">
                                        <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                                            <div className="border-l-[3px] border-blue-500 pl-3">
                                                <div className="text-sm font-bold">
                                                    Prepared By
                                                </div>

                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    PPMP Coordinator / Preparer
                                                </div>
                                            </div>

                                            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <dt className="pms-readonly-label">
                                                        Name
                                                    </dt>

                                                    <dd className="mt-1 font-bold">
                                                        {ppmp.prepared_by_name ||
                                                            '—'}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="pms-readonly-label">
                                                        Position / Designation
                                                    </dt>

                                                    <dd className="mt-1">
                                                        {ppmp.prepared_by_position ||
                                                            '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div className="p-5">
                                            <div className="border-l-[3px] border-violet-500 pl-3">
                                                <div className="text-sm font-bold">
                                                    Submitted By
                                                </div>

                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Division Chief / Head
                                                </div>
                                            </div>

                                            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <dt className="pms-readonly-label">
                                                        Name
                                                    </dt>

                                                    <dd className="mt-1 font-bold">
                                                        {ppmp.submitted_by_name ||
                                                            '—'}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="pms-readonly-label">
                                                        Position / Designation
                                                    </dt>

                                                    <dd className="mt-1">
                                                        {ppmp.submitted_by_position ||
                                                            '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>

                                    {/* HISTORY */}
                                    <div>
                                        <div className="flex items-center gap-3 border-b border-border bg-secondary/25 px-5 py-4">
                                            <History className="size-4 text-primary" />

                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                                                    Workflow History
                                                </div>

                                                <div className="mt-1 text-sm font-bold">
                                                    PPMP Status History
                                                </div>
                                            </div>
                                        </div>

                                        {ppmp.histories.length ===
                                        0 ? (
                                            <EmptyState
                                                icon={
                                                    History
                                                }
                                                title="No status history recorded"
                                                description="Workflow activities will appear here once actions are performed on this PPMP."
                                            />
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="pms-table min-w-[950px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[180px]">
                                                                Date / Time
                                                            </th>

                                                            <th className="w-[210px]">
                                                                Action
                                                            </th>

                                                            <th className="w-[280px]">
                                                                Status Change
                                                            </th>

                                                            <th className="w-[220px]">
                                                                Performed By
                                                            </th>

                                                            <th>
                                                                Remarks
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {ppmp.histories.map(
                                                            (
                                                                history,
                                                            ) => (
                                                                <tr
                                                                    key={
                                                                        history.id
                                                                    }
                                                                >
                                                                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                                        {history.acted_at ??
                                                                            '—'}
                                                                    </td>

                                                                    <td className="font-bold">
                                                                        {formatAction(
                                                                            history.action,
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            {history.from_status && (
                                                                                <>
                                                                                    <StatusBadge
                                                                                        status={
                                                                                            history.from_status
                                                                                        }
                                                                                    />

                                                                                    <span className="text-muted-foreground">
                                                                                        →
                                                                                    </span>
                                                                                </>
                                                                            )}

                                                                            <StatusBadge
                                                                                status={
                                                                                    history.to_status
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </td>

                                                                    <td>
                                                                        {history.action_by ??
                                                                            'Unknown'}
                                                                    </td>

                                                                    <td className="whitespace-pre-wrap text-sm text-muted-foreground">
                                                                        {history.remarks ||
                                                                            '—'}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* PPMP VERSION HISTORY */}
                                    <div className="border-t border-border">
                                        <div className="flex flex-col gap-3 border-b border-border bg-secondary/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <History className="size-4 text-primary" />

                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                                                        PPMP Version History
                                                    </div>

                                                    <div className="mt-1 text-sm font-bold">
                                                        Indicative Revisions
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Original PPMP No.
                                                </div>

                                                <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                                    {
                                                        originalPpmp?.ppmp_no ??
                                                        ppmp.ppmp_no
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {ppmp.versions.length ===
                                        0 ? (
                                            <EmptyState
                                                icon={
                                                    History
                                                }
                                                title="No PPMP versions recorded"
                                                description="PPMP revisions belonging to this series will appear here."
                                            />
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="pms-table min-w-[1000px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[170px]">
                                                                Version
                                                            </th>

                                                            <th className="w-[220px]">
                                                                PPMP No.
                                                            </th>

                                                            <th className="w-[170px]">
                                                                Status
                                                            </th>

                                                            <th className="w-[180px] text-right">
                                                                Total Budget
                                                            </th>

                                                            <th className="w-[200px]">
                                                                Approved
                                                            </th>

                                                            <th className="w-[130px] text-center">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {ppmp.versions.map(
                                                            (
                                                                version,
                                                            ) => (
                                                                <tr
                                                                    key={
                                                                        version.id
                                                                    }
                                                                    className={
                                                                        version.is_current
                                                                            ? 'bg-blue-50/30 dark:bg-blue-950/10'
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <td>
                                                                        <div className="font-bold">
                                                                            {
                                                                                version.version_label
                                                                            }
                                                                        </div>

                                                                        {version.is_current && (
                                                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">
                                                                                Current Version
                                                                            </div>
                                                                        )}
                                                                    </td>

                                                                    <td className="font-bold text-blue-700 dark:text-blue-300">
                                                                        {
                                                                            version.ppmp_no
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <StatusBadge
                                                                            status={
                                                                                version.status
                                                                            }
                                                                        />
                                                                    </td>

                                                                    <td className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                                        {formatCurrency(
                                                                            version.total_budget,
                                                                        )}
                                                                    </td>

                                                                    <td className="text-xs text-muted-foreground">
                                                                        {version.approved_at ??
                                                                            '—'}
                                                                    </td>

                                                                    <td>
                                                                        <div className="flex justify-center">
                                                                            {version.is_current ? (
                                                                                <span className="text-xs font-semibold text-muted-foreground">
                                                                                    Viewing
                                                                                </span>
                                                                            ) : (
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    asChild
                                                                                >
                                                                                    <Link
                                                                                        href={`/ppmps/${version.id}`}
                                                                                    >
                                                                                        View
                                                                                    </Link>
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {can.create_revision && (
                                            <div className="flex flex-col gap-3 border-t border-border bg-emerald-50/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-950/10">
                                                <div>
                                                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                        Next Indicative Revision
                                                    </div>

                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        Create Indicative No. {ppmp.indicative_no + 1} from this approved version. The current approved PPMP will remain unchanged.
                                                    </p>
                                                </div>

                                                <Button
                                                    type="button"
                                                    disabled={
                                                        revisionProcessing
                                                    }
                                                    onClick={
                                                        createIndicativeRevision
                                                    }
                                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    <Plus className="size-4" />

                                                    {revisionProcessing
                                                        ? 'Creating...'
                                                        : `Create Indicative No. ${ppmp.indicative_no + 1}`}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ITEM DETAILS DRAWER */}
                {selectedItem && (
                    <div className="fixed inset-0 z-50 bg-black/30">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Procurement item details"
                            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-border bg-background"
                        >
                            {/* HEADER */}
                            <div className="flex items-start justify-between gap-4 border-b border-border bg-emerald-50/50 px-5 py-4 dark:bg-emerald-950/15">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                        Procurement Item
                                    </div>

                                    <h2 className="mt-1 text-lg font-bold">
                                        {
                                            selectedItem.description_objective
                                        }
                                    </h2>

                                    <div className="mt-2 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(
                                            selectedItem.estimated_budget,
                                        )}
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        setSelectedItem(
                                            null,
                                        )
                                    }
                                >
                                    <X className="size-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="divide-y divide-border">
                                    {/* GENERAL */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-blue-500 pl-3">
                                            <div className="text-sm font-bold">
                                                General Information
                                            </div>
                                        </div>

                                        <dl className="grid gap-4 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <dt className="pms-readonly-label">
                                                    General Description and Objective
                                                </dt>

                                                <dd className="mt-1 whitespace-pre-wrap text-sm leading-6">
                                                    {selectedItem.description_objective ||
                                                        '—'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Project Type
                                                </dt>

                                                <dd className="mt-1 font-semibold">
                                                    {selectedItem.project_type ||
                                                        '—'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Quantity / Size
                                                </dt>

                                                <dd className="mt-1">
                                                    {selectedItem.quantity_size ||
                                                        '—'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* PROCUREMENT */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-emerald-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Procurement Method
                                            </div>
                                        </div>

                                        <dl className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Recommended Mode
                                                </dt>

                                                <dd className="mt-1">
                                                    {selectedItem.recommended_mode_of_procurement ||
                                                        '—'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Pre-Procurement Conference
                                                </dt>

                                                <dd className="mt-1 font-semibold">
                                                    {selectedItem.pre_procurement_conference
                                                        ? 'Yes'
                                                        : 'No'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* SCHEDULE */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-amber-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Procurement Schedule
                                            </div>
                                        </div>

                                        <dl className="grid gap-4 sm:grid-cols-3">
                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Start
                                                </dt>

                                                <dd className="mt-1">
                                                    {formatMonth(
                                                        selectedItem.procurement_start_month,
                                                    )}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    End
                                                </dt>

                                                <dd className="mt-1">
                                                    {formatMonth(
                                                        selectedItem.procurement_end_month,
                                                    )}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Expected Delivery
                                                </dt>

                                                <dd className="mt-1">
                                                    {formatMonth(
                                                        selectedItem.expected_delivery_month,
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* FUNDING */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-violet-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Funding and Budget
                                            </div>
                                        </div>

                                        <dl className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Source of Funds
                                                </dt>

                                                <dd className="mt-1">
                                                    {selectedItem.source_of_funds ||
                                                        '—'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="pms-readonly-label">
                                                    Estimated Budget
                                                </dt>

                                                <dd className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                    {formatCurrency(
                                                        selectedItem.estimated_budget,
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>

                                    {/* ATTACHMENTS */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-sky-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Supporting Documents
                                            </div>
                                        </div>

                                        <ItemAttachments
                                            ppmpId={
                                                ppmp.id
                                            }
                                            item={
                                                selectedItem
                                            }
                                            canEdit={
                                                can.edit
                                            }
                                        />
                                    </section>

                                    {/* REMARKS */}
                                    <section className="p-5">
                                        <div className="mb-4 border-l-[3px] border-slate-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Remarks
                                            </div>
                                        </div>

                                        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                            {selectedItem.remarks ||
                                                'No remarks.'}
                                        </p>
                                    </section>
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-border bg-secondary/25 px-5 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setSelectedItem(
                                            null,
                                        )
                                    }
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
