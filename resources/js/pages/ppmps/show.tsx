import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    FormEvent,
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

interface Ppmp {
    id: number;
    ppmp_no: string;
    fiscal_year: number;
    plan_type: string;
    status: string;
    total_budget: string;

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
    };

    flash: {
        success: string | null;
    };
}

interface Approver {
    id: number;
    name: string;
}

function formatCurrency(
    value: string | number,
): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value));
}

function formatMonth(
    value: string | null,
): string {
    if (!value) {
        return '—';
    }

    const [year, month] = value.split('-');

    if (!year || !month) {
        return value;
    }

    const date = new Date(
        Number(year),
        Number(month) - 1,
        1,
    );

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            month: 'short',
            year: 'numeric',
        },
    ).format(date);
}

function formatStatus(
    status: string,
): string {
    switch (status) {
        case 'submitted':
            return 'Submitted for Review';

        case 'returned_for_revision':
            return 'Returned for Revision';

        case 'approved':
            return 'Approved';

        default:
            return 'Draft';
    }
}

function statusClasses(
    status: string,
): string {
    switch (status) {
        case 'approved':
            return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';

        case 'submitted':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';

        case 'returned_for_revision':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';

        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
}

function formatAction(
    action: string,
): string {
    return action
        .split('_')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1),
        )
        .join(' ');
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

    const index = Math.min(
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
        index === 0 ? 0 : 1,
    )} ${units[index]}`;
}

interface ItemAttachmentsProps {
    ppmpId: number;
    item: PpmpItem;
    canEdit: boolean;
}

function ItemAttachments({
    ppmpId,
    item,
    canEdit,
}: ItemAttachmentsProps) {
    const [file, setFile] =
        useState<File | null>(null);

    const [uploading, setUploading] =
        useState(false);

    const [uploadError, setUploadError] =
        useState<string | null>(null);

    const [inputKey, setInputKey] =
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

        setUploadError(null);

        router.post(
            `/ppmps/${ppmpId}/items/${item.id}/attachments`,
            {
                attachment: file,
            },
            {
                forceFormData: true,
                preserveScroll: true,

                onStart: () => {
                    setUploading(true);
                },

                onFinish: () => {
                    setUploading(false);
                },

                onSuccess: () => {
                    setFile(null);
                    setUploadError(null);

                    setInputKey(
                        (current) =>
                            current + 1,
                    );
                },

                onError: (errors) => {
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
                preserveScroll: true,
            },
        );
    }

    return (
        <div className="min-w-[240px] space-y-3">
            {item.attachments.length >
            0 ? (
                <div className="space-y-2">
                    {item.attachments.map(
                        (attachment) => (
                            <div
                                key={
                                    attachment.id
                                }
                                className="rounded-md border bg-background p-2"
                            >
                                <div className="break-all text-xs font-medium">
                                    {
                                        attachment.original_name
                                    }
                                </div>

                                {attachment.file_size !==
                                    null && (
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {formatBytes(
                                            attachment.file_size,
                                        )}
                                    </div>
                                )}

                                <div className="mt-2 flex flex-wrap gap-2">
                                    <a
                                        href={`/ppmps/${ppmpId}/attachments/${attachment.id}/download`}
                                        className="rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                                    >
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
                                            className="rounded-md border px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ),
                    )}
                </div>
            ) : (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    No supporting
                    documents uploaded.
                </div>
            )}

            {canEdit && (
                <form
                    onSubmit={
                        uploadAttachment
                    }
                    className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3"
                >
                    <input
                        key={inputKey}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        onChange={(event) => {
                            setFile(
                                event.target
                                    .files?.[0] ??
                                    null,
                            );

                            setUploadError(
                                null,
                            );
                        }}
                        className="block w-full text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1 file:text-xs file:font-medium"
                    />

                    <div className="text-[11px] text-muted-foreground">
                        PDF, Word, Excel,
                        JPG or PNG; maximum
                        20 MB.
                    </div>

                    {uploadError && (
                        <p className="text-xs text-red-600">
                            {uploadError}
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
                        className="w-full"
                    >
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
            title: ppmp.ppmp_no,
            href: `/ppmps/${ppmp.id}`,
        },
    ];

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head
                title={ppmp.ppmp_no}
            />

            <div className="flex flex-1 flex-col gap-5 p-4">
                {/* HEADER */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold">
                                {
                                    ppmp.ppmp_no
                                }
                            </h1>

                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                                    ppmp.status,
                                )}`}
                            >
                                {formatStatus(
                                    ppmp.status,
                                )}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Project Procurement
                            Management Plan
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            asChild
                        >
                            <Link href="/ppmps">
                                Back to PPMP
                            </Link>
                        </Button>

                        {can.edit && (
                            <Button
                                asChild
                            >
                                <Link
                                    href={`/ppmps/${ppmp.id}/edit`}
                                >
                                    Edit PPMP
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {flash.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                        {
                            flash.success
                        }
                    </div>
                )}

                {/* SUMMARY */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Fiscal Year
                            </div>

                            <div className="mt-1 text-lg font-semibold">
                                {
                                    ppmp.fiscal_year
                                }
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                PPMP Type
                            </div>

                            <div className="mt-1 text-lg font-semibold capitalize">
                                {
                                    ppmp.plan_type
                                }
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                End-User Unit
                            </div>

                            <div className="mt-1 font-semibold">
                                {
                                    ppmp.office
                                        .code
                                }
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {
                                    ppmp.office
                                        .name
                                }
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Coordinator
                            </div>

                            <div className="mt-1 font-semibold">
                                {
                                    ppmp.coordinator
                                        .name
                                }
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {ppmp
                                    .coordinator
                                    .position_title ??
                                    '—'}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Total Budget
                            </div>

                            <div className="mt-1 text-xl font-bold">
                                {formatCurrency(
                                    ppmp.total_budget,
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* PROCUREMENT ITEMS */}
                <section className="overflow-hidden rounded-xl border bg-background">
                    <div className="border-b p-5">
                        <h2 className="text-lg font-semibold">
                            Procurement
                            Project Details
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Procurement items
                            included in this PPMP.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[2400px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="w-[280px] px-3 py-3 text-left">
                                        1. General
                                        Description and
                                        Objective
                                    </th>

                                    <th className="w-[180px] px-3 py-3 text-left">
                                        2. Project Type
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-left">
                                        3. Quantity and
                                        Size
                                    </th>

                                    <th className="w-[210px] px-3 py-3 text-left">
                                        4. Recommended
                                        Mode
                                    </th>

                                    <th className="w-[150px] px-3 py-3 text-center">
                                        5. Pre-
                                        Procurement
                                        Conference
                                    </th>

                                    <th className="w-[140px] px-3 py-3 text-left">
                                        6. Start
                                    </th>

                                    <th className="w-[140px] px-3 py-3 text-left">
                                        7. End
                                    </th>

                                    <th className="w-[160px] px-3 py-3 text-left">
                                        8. Expected
                                        Delivery
                                    </th>

                                    <th className="w-[170px] px-3 py-3 text-left">
                                        9. Source of
                                        Funds
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-right">
                                        10. Estimated
                                        Budget
                                    </th>

                                    <th className="w-[270px] px-3 py-3 text-left">
                                        11. Supporting
                                        Documents
                                    </th>

                                    <th className="w-[220px] px-3 py-3 text-left">
                                        12. Remarks
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {ppmp.items
                                    .length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                12
                                            }
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No procurement
                                            items.
                                        </td>
                                    </tr>
                                ) : (
                                    ppmp.items.map(
                                        (
                                            item,
                                        ) => (
                                            <tr
                                                key={
                                                    item.id
                                                }
                                                className="align-top hover:bg-muted/20"
                                            >
                                                <td className="whitespace-pre-wrap px-3 py-4">
                                                    {item.description_objective ||
                                                        '—'}
                                                </td>

                                                <td className="px-3 py-4">
                                                    {item.project_type ||
                                                        '—'}
                                                </td>

                                                <td className="whitespace-pre-wrap px-3 py-4">
                                                    {item.quantity_size ||
                                                        '—'}
                                                </td>

                                                <td className="px-3 py-4">
                                                    {item.recommended_mode_of_procurement ||
                                                        '—'}
                                                </td>

                                                <td className="px-3 py-4 text-center">
                                                    {item.pre_procurement_conference
                                                        ? 'Yes'
                                                        : 'No'}
                                                </td>

                                                <td className="whitespace-nowrap px-3 py-4">
                                                    {formatMonth(
                                                        item.procurement_start_month,
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-3 py-4">
                                                    {formatMonth(
                                                        item.procurement_end_month,
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-3 py-4">
                                                    {formatMonth(
                                                        item.expected_delivery_month,
                                                    )}
                                                </td>

                                                <td className="px-3 py-4">
                                                    {item.source_of_funds ||
                                                        '—'}
                                                </td>

                                                <td className="whitespace-nowrap px-3 py-4 text-right font-medium">
                                                    {formatCurrency(
                                                        item.estimated_budget,
                                                    )}
                                                </td>

                                                <td className="px-3 py-4">
                                                    <ItemAttachments
                                                        ppmpId={
                                                            ppmp.id
                                                        }
                                                        item={
                                                            item
                                                        }
                                                        canEdit={
                                                            can.edit
                                                        }
                                                    />
                                                </td>

                                                <td className="whitespace-pre-wrap px-3 py-4">
                                                    {item.remarks ||
                                                        '—'}
                                                </td>
                                            </tr>
                                        ),
                                    )
                                )}
                            </tbody>

                            <tfoot className="border-t bg-muted/30">
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-4 py-4 text-right font-semibold"
                                    >
                                        TOTAL BUDGET
                                    </td>

                                    <td className="px-4 py-4 text-right text-base font-bold">
                                        {formatCurrency(
                                            ppmp.total_budget,
                                        )}
                                    </td>

                                    <td
                                        colSpan={2}
                                    />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* SIGNATURE INFORMATION */}
                <section className="rounded-xl border bg-background p-5">
                    <h2 className="mb-5 text-lg font-semibold">
                        Prepared and Submitted
                        By
                    </h2>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                            <div className="text-sm font-semibold">
                                Prepared By
                            </div>

                            <dl className="mt-4 space-y-3">
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Name
                                    </dt>

                                    <dd className="font-medium">
                                        {ppmp.prepared_by_name ||
                                            '—'}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Position /
                                        Designation
                                    </dt>

                                    <dd>
                                        {ppmp.prepared_by_position ||
                                            '—'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-lg border p-4">
                            <div className="text-sm font-semibold">
                                Submitted By
                            </div>

                            <dl className="mt-4 space-y-3">
                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Division
                                        Chief /
                                        Head
                                    </dt>

                                    <dd className="font-medium">
                                        {ppmp.submitted_by_name ||
                                            '—'}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-xs text-muted-foreground">
                                        Position /
                                        Designation
                                    </dt>

                                    <dd>
                                        {ppmp.submitted_by_position ||
                                            '—'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </section>

                {/* STATUS HISTORY */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold">
                            PPMP Status History
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Recorded workflow
                            activities for this
                            PPMP.
                        </p>
                    </div>

                    {ppmp.histories.length ===
                    0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No status history
                            recorded.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {ppmp.histories.map(
                                (
                                    history,
                                ) => (
                                    <div
                                        key={
                                            history.id
                                        }
                                        className="rounded-lg border p-4"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="font-medium">
                                                    {formatAction(
                                                        history.action,
                                                    )}
                                                </div>

                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {history.from_status
                                                        ? `${formatStatus(
                                                              history.from_status,
                                                          )} → `
                                                        : ''}

                                                    {formatStatus(
                                                        history.to_status,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-xs text-muted-foreground sm:text-right">
                                                <div>
                                                    {history.acted_at ??
                                                        '—'}
                                                </div>

                                                <div>
                                                    by{' '}
                                                    {history.action_by ??
                                                        'Unknown'}
                                                </div>
                                            </div>
                                        </div>

                                        {history.remarks && (
                                            <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                                                {
                                                    history.remarks
                                                }
                                            </div>
                                        )}
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
