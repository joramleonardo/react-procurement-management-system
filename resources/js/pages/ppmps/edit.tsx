import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { PageHeader } from '@/components/pms/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';
import {
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    FileText,
    Info,
    Pencil,
    Plus,
    Save,
    Trash2,
    UsersRound,
    X,
} from 'lucide-react';
import {
    type FormEventHandler,
    useEffect,
    useMemo,
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

type PpmpItemForm = {
    id?: number;

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

    remarks: string;
};

type PpmpFormData = {
    fiscal_year: number;

    prepared_by_name: string;
    prepared_by_position: string;

    submitted_by_name: string;
    submitted_by_position: string;

    items: PpmpItemForm[];
};

interface EditProps {
    ppmp: {
        id: number;
        ppmp_no: string;

        ppmp_series_id: number;
        indicative_no: number;

        fiscal_year: number;
        plan_type: string;
        status: string;

        total_budget: string;
        approved_pr_total: string;

        series: {
            id: number;
            office_id: number;
            fiscal_year: number;
            original_budget: string;
            approved_pr_total: string;
        } | null;

        prepared_by_name: string | null;
        prepared_by_position: string | null;

        submitted_by_name: string | null;
        submitted_by_position: string | null;

        office: Office;
        coordinator: Coordinator;

        items: PpmpItemForm[];
    };
}

type ItemField =
    Exclude<
        keyof PpmpItemForm,
        'id'
    >;

type EditTab =
    | 'information'
    | 'items'
    | 'signatories';

function createEmptyItem(): PpmpItemForm {
    return {
        description_objective: '',
        project_type: '',
        quantity_size: '',

        recommended_mode_of_procurement:
            '',

        pre_procurement_conference:
            false,

        procurement_start_month:
            '',

        procurement_end_month:
            '',

        expected_delivery_month:
            '',

        source_of_funds: '',

        estimated_budget: '',

        remarks: '',
    };
}

function formatCurrency(
    value: number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',

            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    ).format(value);
}

function sanitizeBudgetInput(
    value: string,
): string {
    const withoutCommas =
        value.replace(/,/g, '');

    const cleaned =
        withoutCommas.replace(
            /[^\d.]/g,
            '',
        );

    const parts =
        cleaned.split('.');

    const whole =
        parts[0] ?? '';

    const decimal =
        parts
            .slice(1)
            .join('')
            .slice(0, 2);

    if (
        cleaned.includes('.')
    ) {
        return `${whole}.${decimal}`;
    }

    return whole;
}

function formatBudgetInput(
    value: string,
): string {
    if (!value) {
        return '';
    }

    const [
        wholePart,
        decimalPart,
    ] = value.split('.');

    const normalizedWhole =
        wholePart.replace(
            /^0+(?=\d)/,
            '',
        ) || '0';

    const formattedWhole =
        normalizedWhole.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ',',
        );

    if (
        decimalPart !== undefined
    ) {
        return `${formattedWhole}.${decimalPart}`;
    }

    return formattedWhole;
}

function normalizeBudgetInput(
    value: string,
): string {
    if (!value) {
        return '';
    }

    const amount =
        Number(
            value.replace(
                /,/g,
                '',
            ),
        );

    if (
        !Number.isFinite(
            amount,
        )
    ) {
        return '';
    }

    return amount.toFixed(2);
}

function formatMonth(
    value: string,
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

function itemSchedule(
    item: PpmpItemForm,
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

export default function EditPpmp({
    ppmp,
}: EditProps) {
    const office =
        ppmp.office;

    const coordinator =
        ppmp.coordinator;

    const currentFiscalYear =
        new Date().getFullYear();

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
        {
            title: 'Edit PPMP',
            href: `/ppmps/${ppmp.id}/edit`,
        },
    ];

    const {
        data,
        setData,
        put,
        processing,
        errors,
    } =
        useForm<PpmpFormData>({
            fiscal_year:
                ppmp.fiscal_year,

            prepared_by_name:
                ppmp.prepared_by_name ??
                '',

            prepared_by_position:
                ppmp.prepared_by_position ??
                '',

            submitted_by_name:
                ppmp.submitted_by_name ??
                '',

            submitted_by_position:
                ppmp.submitted_by_position ??
                '',

            items:
                ppmp.items.map(
                    (
                        item,
                    ): PpmpItemForm => ({
                        ...item,

                        estimated_budget:
                            String(
                                item.estimated_budget,
                            ),

                        remarks:
                            item.remarks ??
                            '',
                    }),
                ),
        });

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<EditTab>(
            'information',
        );

    const [
        itemEditorOpen,
        setItemEditorOpen,
    ] =
        useState(false);

    const [
        editingIndex,
        setEditingIndex,
    ] =
        useState<number | null>(
            null,
        );

    const [
        editorItem,
        setEditorItem,
    ] =
        useState<PpmpItemForm>(
            createEmptyItem(),
        );

    const [
        editorError,
        setEditorError,
    ] =
        useState<string | null>(
            null,
        );

    const totalBudget =
        useMemo(() => {
            return data.items.reduce(
                (
                    total,
                    item,
                ) => {
                    const amount =
                        Number(
                            item.estimated_budget.replace(
                                /,/g,
                                '',
                            ),
                        ) || 0;

                    return (
                        total +
                        amount
                    );
                },
                0,
            );
        }, [data.items]);

    const originalBudget =
        Number(
            ppmp.series?.original_budget ??
            ppmp.total_budget ??
            0,
        ) || 0;

    const isRevision =
        ppmp.plan_type === 'indicative' &&
        ppmp.indicative_no > 1;

    /*
     * Client-side convenience check only.
     * The backend remains authoritative.
     */
    const budgetDifference =
        totalBudget -
        originalBudget;

    const budgetMatchesOriginal =
        Math.abs(
            budgetDifference,
        ) < 0.005;

    const hasItemErrors =
        Object.keys(
            errors,
        ).some(
            (key) =>
                key === 'items' ||
                key.startsWith(
                    'items.',
                ),
        );

    function errorFor(
        key: string,
    ): string | undefined {
        return (
            errors as Record<
                string,
                string | undefined
            >
        )[key];
    }

    /*
     * Automatically open an item containing
     * a Laravel validation error.
     */
    useEffect(() => {
        const itemErrorKey =
            Object.keys(
                errors,
            ).find((key) =>
                /^items\.\d+\./.test(
                    key,
                ),
            );

        if (
            !itemErrorKey
        ) {
            return;
        }

        const match =
            itemErrorKey.match(
                /^items\.(\d+)\./,
            );

        if (!match) {
            return;
        }

        const index =
            Number(
                match[1],
            );

        const item =
            data.items[
                index
            ];

        if (!item) {
            return;
        }

        setActiveTab(
            'items',
        );

        setEditingIndex(
            index,
        );

        setEditorItem({
            ...item,
        });

        setItemEditorOpen(
            true,
        );
    }, [errors, data.items]);

    function updateEditorItem<
        K extends ItemField,
    >(
        field: K,
        value: PpmpItemForm[K],
    ) {
        setEditorItem(
            (
                current,
            ) => ({
                ...current,

                [field]:
                    value,
            }),
        );

        setEditorError(
            null,
        );
    }

    function openNewItem() {
        setEditingIndex(
            null,
        );

        setEditorItem(
            createEmptyItem(),
        );

        setEditorError(
            null,
        );

        setItemEditorOpen(
            true,
        );
    }

    function openEditItem(
        index: number,
    ) {
        const item =
            data.items[
                index
            ];

        if (!item) {
            return;
        }

        setEditingIndex(
            index,
        );

        setEditorItem({
            ...item,
        });

        setEditorError(
            null,
        );

        setItemEditorOpen(
            true,
        );
    }

    function closeItemEditor() {
        setItemEditorOpen(
            false,
        );

        setEditingIndex(
            null,
        );

        setEditorError(
            null,
        );
    }

    function saveEditorItem() {
        if (
            !editorItem.description_objective.trim()
        ) {
            setEditorError(
                'Please enter the general description and objective.',
            );

            return;
        }

        if (
            !editorItem.project_type
        ) {
            setEditorError(
                'Please select the project type.',
            );

            return;
        }

        if (
            !editorItem.estimated_budget
        ) {
            setEditorError(
                'Please enter the estimated budget.',
            );

            return;
        }

        const normalizedItem:
            PpmpItemForm = {
            ...editorItem,

            estimated_budget:
                normalizeBudgetInput(
                    editorItem.estimated_budget,
                ),
        };

        if (
            editingIndex !==
            null
        ) {
            const items =
                [
                    ...data.items,
                ];

            items[
                editingIndex
            ] =
                normalizedItem;

            setData(
                'items',
                items,
            );
        } else {
            setData(
                'items',
                [
                    ...data.items,
                    normalizedItem,
                ],
            );
        }

        closeItemEditor();
    }

    function removeItem(
        index: number,
    ) {
        if (
            data.items.length <=
            1
        ) {
            return;
        }

        const item =
            data.items[index];

        const confirmed =
            window.confirm(
                item?.id
                    ? 'Remove this existing procurement item from the PPMP? This change will take effect after you save the PPMP.'
                    : 'Remove this procurement item?',
            );

        if (
            !confirmed
        ) {
            return;
        }

        setData(
            'items',
            data.items.filter(
                (
                    _,
                    itemIndex,
                ) =>
                    itemIndex !==
                    index,
            ),
        );
    }

    const submit:
        FormEventHandler<HTMLFormElement> =
        (event) => {
            event.preventDefault();

            put(
                `/ppmps/${ppmp.id}`,
                {
                    preserveScroll:
                        true,
                },
            );
        };

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head
                title={`Edit ${ppmp.ppmp_no}`}
            />

            <form
                onSubmit={submit}
                className="pms-page bg-background"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Planning"
                    title="Edit PPMP"
                    description={`Update ${ppmp.plan_type === 'indicative' ? `Indicative No. ${ppmp.indicative_no}` : 'Final'} procurement information and project details for ${ppmp.ppmp_no}.`}
                    icon={
                        FileText
                    }
                    actions={
                        <div className="min-w-[190px] text-right">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Current
                                Total Budget
                            </div>

                            <div className="mt-1 text-2xl font-bold tabular-nums text-primary">
                                {formatCurrency(
                                    totalBudget,
                                )}
                            </div>
                        </div>
                    }
                />

                <div className="mx-auto w-full max-w-[1680px] p-4 md:p-6">
                    {/* MAIN WORKSPACE */}
                    <section className="border border-border bg-card">
                        {/* PPMP SUMMARY */}
                        <div className="grid border-b border-border bg-secondary/25 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            {/* REFERENCE */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP No.
                                </div>

                                <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                    {ppmp.ppmp_no}
                                </div>
                            </div>

                            {/* VERSION */}
                            <div className="border-b border-border px-4 py-3 lg:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP Version
                                </div>

                                <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {ppmp.plan_type ===
                                    'indicative'
                                        ? `Indicative No. ${ppmp.indicative_no}`
                                        : 'Final'}
                                </div>
                            </div>

                            {/* OFFICE */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    End-User Unit
                                </div>

                                <div className="mt-1 text-sm font-bold text-primary">
                                    {office.code}
                                </div>
                            </div>

                            {/* FY */}
                            <div className="border-b border-border px-4 py-3 lg:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Fiscal Year
                                </div>

                                <div className="mt-1 text-sm font-bold">
                                    {data.fiscal_year}
                                </div>
                            </div>

                            {/* TYPE */}
                            <div className="border-b border-border px-4 py-3 sm:border-r sm:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP Type
                                </div>

                                <div className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-300">
                                    {ppmp.plan_type ===
                                    'indicative'
                                        ? 'Indicative'
                                        : 'Final'}
                                </div>
                            </div>

                            {/* ITEM COUNT */}
                            <div className="px-4 py-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Items
                                </div>

                                <div className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {data.items.length}
                                </div>
                            </div>
                        </div>

                        {/* WORKSPACE TABS */}
                        <div className="grid border-b border-border sm:grid-cols-3">
                            {/* INFORMATION */}
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
                                <div
                                    className={`flex size-8 shrink-0 items-center justify-center border ${
                                        activeTab ===
                                        'information'
                                            ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                            : 'border-border bg-secondary/30 text-muted-foreground'
                                    }`}
                                >
                                    <Info className="size-4" />
                                </div>

                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        Section 01
                                    </div>

                                    <div className="mt-0.5 text-sm font-bold">
                                        PPMP
                                        Information
                                    </div>
                                </div>
                            </button>

                            {/* ITEMS */}
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
                                <div
                                    className={`flex size-8 shrink-0 items-center justify-center border ${
                                        activeTab ===
                                        'items'
                                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                            : 'border-border bg-secondary/30 text-muted-foreground'
                                    }`}
                                >
                                    <ClipboardList className="size-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                Section 02
                                            </div>

                                            <div className="mt-0.5 text-sm font-bold">
                                                Procurement
                                                Items
                                            </div>
                                        </div>

                                        <span className="text-lg font-bold tabular-nums text-emerald-600">
                                            {
                                                data.items
                                                    .length
                                            }
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {/* SIGNATORIES */}
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
                                <div
                                    className={`flex size-8 shrink-0 items-center justify-center border ${
                                        activeTab ===
                                        'signatories'
                                            ? 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
                                            : 'border-border bg-secondary/30 text-muted-foreground'
                                    }`}
                                >
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
                        <div className="min-h-[440px]">
                            {/* INFORMATION */}
                            {activeTab ===
                                'information' && (
                                <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
                                    {/* MAIN INFORMATION */}
                                    <div className="border-b border-border xl:border-b-0 xl:border-r">
                                        <div className="border-b border-border bg-blue-50/40 px-5 py-4 dark:bg-blue-950/10">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700 dark:text-blue-300">
                                                PPMP
                                                Information
                                            </div>

                                            <h2 className="mt-1 text-base font-bold">
                                                Plan
                                                Details
                                            </h2>

                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                Update the procurement plan details. PPMP type, Indicative number, office, and coordinator are controlled by the system.
                                            </p>
                                        </div>

                                        <div className="grid md:grid-cols-2">
                                            {/* FISCAL YEAR */}
                                            <div className="border-b border-border p-5 md:border-r">
                                                <div className="pms-field">
                                                    <Label htmlFor="fiscal_year">
                                                        Fiscal
                                                        Year
                                                    </Label>

                                                    <Input
                                                        id="fiscal_year"
                                                        type="number"
                                                        min="2020"
                                                        max={
                                                            currentFiscalYear +
                                                            5
                                                        }
                                                        value={
                                                            data.fiscal_year
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'fiscal_year',
                                                                Number(
                                                                    event
                                                                        .target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        disabled={
                                                            ppmp.indicative_no >
                                                            1
                                                        }
                                                        required
                                                    />

                                                    {ppmp.indicative_no >
                                                        1 && (
                                                        <p className="text-xs leading-5 text-muted-foreground">
                                                            Fiscal year is inherited from the PPMP series and cannot be changed on a later Indicative revision.
                                                        </p>
                                                    )}

                                                    <InputError
                                                        message={
                                                            errors.fiscal_year
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* TYPE */}
                                            <div className="border-b border-border bg-blue-50/20 p-5 dark:bg-blue-950/10">
                                                <div className="pms-readonly-label">
                                                    PPMP Type
                                                </div>

                                                <div className="mt-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                                                    {ppmp.plan_type ===
                                                    'indicative'
                                                        ? 'Indicative'
                                                        : 'Final'}
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Controlled by the system and cannot be changed by the PPMP Coordinator.
                                                </div>
                                            </div>

                                            {/* INDICATIVE NUMBER */}
                                            <div className="border-b border-border bg-emerald-50/20 p-5 md:border-r dark:bg-emerald-950/10">
                                                <div className="pms-readonly-label">
                                                    Indicative No.
                                                </div>

                                                <div className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                                    {ppmp.indicative_no}
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    This version number is assigned automatically and cannot be changed manually.
                                                </div>
                                            </div>

                                            {/* ORIGINAL BUDGET */}
                                            <div className="border-b border-border bg-amber-50/25 p-5 dark:bg-amber-950/10">
                                                <div className="pms-readonly-label">
                                                    Original PPMP Budget
                                                </div>

                                                <div className="mt-2 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                                                    {formatCurrency(
                                                        originalBudget,
                                                    )}
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {ppmp.indicative_no ===
                                                    1
                                                        ? 'Indicative No. 1 establishes the original PPMP budget when approved.'
                                                        : 'This is the permanent budget of the PPMP series. This revision must retain exactly the same total.'}
                                                </div>
                                            </div>

                                            {/* OFFICE */}
                                            <div className="border-b border-border bg-blue-50/25 p-5 md:border-r dark:bg-blue-950/10">
                                                <div className="pms-readonly-label">
                                                    End-User /
                                                    Implementing
                                                    Unit
                                                </div>

                                                <div className="mt-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                                                    {
                                                        office.code
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {
                                                        office.name
                                                    }
                                                </div>
                                            </div>

                                            {/* COORDINATOR */}
                                            <div className="border-b border-border bg-violet-50/25 p-5 dark:bg-violet-950/10">
                                                <div className="pms-readonly-label">
                                                    PPMP
                                                    Coordinator
                                                </div>

                                                <div className="mt-2 text-sm font-bold">
                                                    {
                                                        coordinator.name
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {coordinator.position_title ??
                                                        'No position title'}
                                                </div>
                                            </div>

                                            {/* REFERENCE */}
                                            <div className="p-5 md:col-span-2">
                                                <div className="flex gap-3 border-l-[3px] border-primary bg-primary/5 px-4 py-3">
                                                    <FileText className="mt-0.5 size-4 shrink-0 text-primary" />

                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary">
                                                            PPMP
                                                            Reference
                                                        </div>

                                                        <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                                            {
                                                                ppmp.ppmp_no
                                                            }
                                                        </div>

                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            The
                                                            reference
                                                            number is
                                                            generated
                                                            by the
                                                            system
                                                            and is
                                                            not
                                                            editable.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* EDITING GUIDE */}
                                    <aside className="bg-secondary/15">
                                        <div className="border-b border-border px-5 py-4">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                                Edit Guide
                                            </div>

                                            <h3 className="mt-1 text-sm font-bold">
                                                Updating
                                                this PPMP
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-border">
                                            <div className="border-l-[3px] border-blue-500 px-5 py-4">
                                                <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                                    Information
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Review the fiscal year, system-controlled PPMP type and version, office, and coordinator.
                                                </p>
                                            </div>

                                            <div className="border-l-[3px] border-emerald-500 px-5 py-4">
                                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                    Procurement
                                                    Items
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Existing
                                                    items can
                                                    be edited,
                                                    and new
                                                    procurement
                                                    items can
                                                    be added.
                                                </p>
                                            </div>

                                            <div className="border-l-[3px] border-violet-500 px-5 py-4">
                                                <div className="text-xs font-bold text-violet-700 dark:text-violet-300">
                                                    Signatories
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Update
                                                    the names
                                                    and
                                                    designations
                                                    that
                                                    appear on
                                                    the PPMP.
                                                </p>
                                            </div>

                                            <div className="border-l-[3px] border-amber-500 bg-amber-50/50 px-5 py-4 dark:bg-amber-950/10">
                                                <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                                    Supporting
                                                    Documents
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Item
                                                    attachments
                                                    remain
                                                    managed
                                                    from the
                                                    PPMP
                                                    details
                                                    page.
                                                </p>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            )}

                            {/* ITEMS TAB */}
                            {activeTab ===
                                'items' && (
                                <div>
                                    <div className="flex flex-col gap-3 border-b border-border bg-emerald-50/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-950/10">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                                Procurement
                                                Items
                                            </div>

                                            <h2 className="mt-1 text-base font-bold">
                                                Projects /
                                                Activities
                                            </h2>

                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                Review,
                                                edit, add,
                                                or remove
                                                procurement
                                                items in
                                                this PPMP.
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={
                                                openNewItem
                                            }
                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        >
                                            <Plus className="size-4" />

                                            Add
                                            Procurement
                                            Item
                                        </Button>
                                    </div>

                                    {hasItemErrors && (
                                        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                            {errorFor(
                                                'items',
                                            ) ??
                                                'One or more procurement items contain validation errors.'}
                                        </div>
                                    )}

                                    {isRevision && (
                                        <div
                                            className={`grid border-b px-5 py-3 text-xs sm:grid-cols-3 ${
                                                budgetMatchesOriginal
                                                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'
                                                    : 'border-red-200 bg-red-50/60 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-300'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold uppercase tracking-[0.08em]">
                                                    Original Budget
                                                </div>

                                                <div className="mt-1 font-bold tabular-nums">
                                                    {formatCurrency(
                                                        originalBudget,
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="font-bold uppercase tracking-[0.08em]">
                                                    Current Revision Total
                                                </div>

                                                <div className="mt-1 font-bold tabular-nums">
                                                    {formatCurrency(
                                                        totalBudget,
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="font-bold uppercase tracking-[0.08em]">
                                                    Difference
                                                </div>

                                                <div className="mt-1 font-bold tabular-nums">
                                                    {formatCurrency(
                                                        Math.abs(
                                                            budgetDifference,
                                                        ),
                                                    )}
                                                </div>

                                                <div className="mt-1">
                                                    {budgetMatchesOriginal
                                                        ? 'Budget matches the original PPMP.'
                                                        : budgetDifference < 0
                                                          ? 'The remaining amount must be reallocated before saving.'
                                                          : 'The revision exceeds the original PPMP budget.'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {data.items.length ===
                                    0 ? (
                                        <div className="grid min-h-[340px] place-items-center p-6">
                                            <div className="max-w-md text-center">
                                                <div className="mx-auto flex size-14 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                    <ClipboardList className="size-6" />
                                                </div>

                                                <h3 className="mt-4 text-base font-bold">
                                                    No
                                                    procurement
                                                    items
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    Add a
                                                    procurement
                                                    item to
                                                    this
                                                    PPMP.
                                                </p>

                                                <Button
                                                    type="button"
                                                    onClick={
                                                        openNewItem
                                                    }
                                                    className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    <Plus className="size-4" />

                                                    Add Item
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto">
                                                <table className="pms-table min-w-[1260px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[55px]">
                                                                #
                                                            </th>

                                                            <th className="w-[320px]">
                                                                Procurement
                                                                Item
                                                            </th>

                                                            <th className="w-[155px]">
                                                                Project
                                                                Type
                                                            </th>

                                                            <th className="w-[150px]">
                                                                Quantity
                                                                /
                                                                Size
                                                            </th>

                                                            <th className="w-[190px]">
                                                                Procurement
                                                                Mode
                                                            </th>

                                                            <th className="w-[200px]">
                                                                Schedule
                                                            </th>

                                                            <th className="w-[160px]">
                                                                Source
                                                                of
                                                                Funds
                                                            </th>

                                                            <th className="w-[170px] text-right">
                                                                Estimated
                                                                Budget
                                                            </th>

                                                            <th className="w-[125px] text-center">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {data.items.map(
                                                            (
                                                                item,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={
                                                                        item.id ??
                                                                        `new-${index}`
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
                                                                                openEditItem(
                                                                                    index,
                                                                                )
                                                                            }
                                                                            className="text-left"
                                                                        >
                                                                            <div className="font-bold text-blue-700 hover:underline dark:text-blue-300">
                                                                                {item.description_objective ||
                                                                                    'Untitled procurement item'}
                                                                            </div>

                                                                            {item.id ? (
                                                                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                                                                                    Existing
                                                                                    PPMP
                                                                                    Item
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-emerald-600">
                                                                                    New
                                                                                    Item
                                                                                </div>
                                                                            )}
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
                                                                        <div className="flex items-start gap-2">
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

                                                                    <td className="text-right">
                                                                        <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                                            {formatCurrency(
                                                                                Number(
                                                                                    item.estimated_budget ||
                                                                                        0,
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    <td>
                                                                        <div className="flex justify-center gap-1">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    openEditItem(
                                                                                        index,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Pencil className="size-3.5" />

                                                                                <span className="sr-only">
                                                                                    Edit
                                                                                </span>
                                                                            </Button>

                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={
                                                                                    data
                                                                                        .items
                                                                                        .length <=
                                                                                    1
                                                                                }
                                                                                onClick={() =>
                                                                                    removeItem(
                                                                                        index,
                                                                                    )
                                                                                }
                                                                                className="text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                                                            >
                                                                                <Trash2 className="size-3.5" />

                                                                                <span className="sr-only">
                                                                                    Remove
                                                                                </span>
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ITEM TOTAL */}
                                            <div className="grid border-t border-border bg-secondary/20 sm:grid-cols-[1fr_auto]">
                                                <div className="flex items-center px-5 py-4 text-xs text-muted-foreground">
                                                    {
                                                        data.items
                                                            .length
                                                    }{' '}
                                                    procurement
                                                    item
                                                    {data.items
                                                        .length ===
                                                    1
                                                        ? ''
                                                        : 's'}
                                                </div>

                                                <div className="flex items-center gap-4 border-t border-border px-5 py-4 sm:border-l sm:border-t-0">
                                                    <div className="text-right">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                            Total
                                                            PPMP
                                                            Budget
                                                        </div>

                                                        <div className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                            {formatCurrency(
                                                                totalBudget,
                                                            )}
                                                        </div>
                                                    </div>

                                                    <CircleDollarSign className="size-6 text-emerald-600" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SIGNATORIES TAB */}
                            {activeTab ===
                                'signatories' && (
                                <div>
                                    <div className="border-b border-border bg-violet-50/35 px-5 py-4 dark:bg-violet-950/10">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-violet-700 dark:text-violet-300">
                                            Signatories
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Prepared
                                            and
                                            Submitted
                                            By
                                        </h2>

                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            Update
                                            signatory
                                            information
                                            recorded
                                            on the
                                            official
                                            PPMP.
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2">
                                        {/* PREPARED BY */}
                                        <div className="border-b border-border p-5 md:border-b-0 md:border-r md:p-6">
                                            <div className="mb-5 flex items-center gap-3 border-l-[3px] border-blue-500 bg-blue-50/40 px-4 py-3 dark:bg-blue-950/10">
                                                <div className="flex size-9 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                                                    <UsersRound className="size-4" />
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold">
                                                        Prepared
                                                        By
                                                    </div>

                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        PPMP
                                                        Coordinator
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="pms-field">
                                                    <Label htmlFor="prepared_by_name">
                                                        Name
                                                    </Label>

                                                    <Input
                                                        id="prepared_by_name"
                                                        value={
                                                            data.prepared_by_name
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'prepared_by_name',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        required
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.prepared_by_name
                                                        }
                                                    />
                                                </div>

                                                <div className="pms-field">
                                                    <Label htmlFor="prepared_by_position">
                                                        Position
                                                        /
                                                        Designation
                                                    </Label>

                                                    <Input
                                                        id="prepared_by_position"
                                                        value={
                                                            data.prepared_by_position
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'prepared_by_position',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.prepared_by_position
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* SUBMITTED BY */}
                                        <div className="p-5 md:p-6">
                                            <div className="mb-5 flex items-center gap-3 border-l-[3px] border-violet-500 bg-violet-50/40 px-4 py-3 dark:bg-violet-950/10">
                                                <div className="flex size-9 items-center justify-center border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400">
                                                    <UsersRound className="size-4" />
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold">
                                                        Submitted
                                                        By
                                                    </div>

                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        Division
                                                        Chief /
                                                        Head
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="pms-field">
                                                    <Label htmlFor="submitted_by_name">
                                                        Division
                                                        Chief /
                                                        Head
                                                    </Label>

                                                    <Input
                                                        id="submitted_by_name"
                                                        value={
                                                            data.submitted_by_name
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'submitted_by_name',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Name of Division Chief / Head"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.submitted_by_name
                                                        }
                                                    />
                                                </div>

                                                <div className="pms-field">
                                                    <Label htmlFor="submitted_by_position">
                                                        Position
                                                        /
                                                        Designation
                                                    </Label>

                                                    <Input
                                                        id="submitted_by_position"
                                                        value={
                                                            data.submitted_by_position
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'submitted_by_position',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Position / designation"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.submitted_by_position
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TAB NAVIGATION */}
                        <div className="flex flex-col gap-3 border-t border-border bg-secondary/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                {activeTab ===
                                    'information' &&
                                    'Review the PPMP information, then continue to Procurement Items.'}

                                {activeTab ===
                                    'items' &&
                                    `${data.items.length} procurement item${
                                        data.items.length ===
                                        1
                                            ? ''
                                            : 's'
                                    } currently included.`}

                                {activeTab ===
                                    'signatories' &&
                                    'Review the signatories before saving the changes.'}
                            </div>

                            <div className="flex items-center gap-2">
                                {activeTab !==
                                    'information' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setActiveTab(
                                                activeTab ===
                                                    'signatories'
                                                    ? 'items'
                                                    : 'information',
                                            )
                                        }
                                    >
                                        <ChevronLeft className="size-4" />

                                        Previous
                                    </Button>
                                )}

                                {activeTab !==
                                    'signatories' && (
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            setActiveTab(
                                                activeTab ===
                                                    'information'
                                                    ? 'items'
                                                    : 'signatories',
                                            )
                                        }
                                    >
                                        Next

                                        <ChevronRight className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div className="flex items-center gap-4">
                            {/* <div className="flex size-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                                <CircleDollarSign className="size-5" />
                            </div> */}

                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    {isRevision
                                        ? 'Current / Required Budget'
                                        : 'Total PPMP Budget'}
                                </div>

                                <div className="mt-0.5 text-lg font-bold tabular-nums text-primary">
                                    {formatCurrency(
                                        totalBudget,
                                    )}

                                    {isRevision && (
                                        <span className="ml-2 text-xs font-semibold text-muted-foreground">
                                            / {formatCurrency(
                                                originalBudget,
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    }
                >
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                    >
                        <Link
                            href={`/ppmps/${ppmp.id}`}
                        >
                            Cancel
                        </Link>
                    </Button>

                    <Button
                        type="submit"
                        disabled={
                            processing ||
                            (
                                isRevision &&
                                !budgetMatchesOriginal
                            )
                        }
                    >
                        <Save className="size-4" />

                        {processing
                            ? 'Saving Changes...'
                            : isRevision &&
                                !budgetMatchesOriginal
                              ? 'Budget Must Match Original'
                              : 'Save Changes'}
                    </Button>
                </ActionBar>

                {/* ITEM EDITOR */}
                {itemEditorOpen && (
                    <div className="fixed inset-0 z-50 bg-black/30">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={
                                editingIndex !==
                                null
                                    ? 'Edit procurement item'
                                    : 'Add procurement item'
                            }
                            className="absolute inset-y-0 right-0 flex w-full max-w-[720px] flex-col border-l border-border bg-background"
                        >

                            {/* EDITOR HEADER */}
                            <div className="flex items-start justify-between gap-4 border-b border-border bg-emerald-50/50 px-5 py-4 dark:bg-emerald-950/15">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                        Procurement Item
                                    </div>

                                    <h2 className="mt-1 text-lg font-bold">
                                        {editingIndex !==
                                        null
                                            ? 'Edit Procurement Item'
                                            : 'Add Procurement Item'}
                                    </h2>

                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        Update the project details, procurement schedule, funding, and estimated budget.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={
                                        closeItemEditor
                                    }
                                >
                                    <X className="size-5" />

                                    <span className="sr-only">
                                        Close
                                    </span>
                                </Button>
                            </div>

                            {/* EDITOR CONTENT */}
                            <div className="flex-1 overflow-y-auto">
                                {editorError && (
                                    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                        {
                                            editorError
                                        }
                                    </div>
                                )}

                                <div className="space-y-6 p-5 md:p-6">

                                    {/* GENERAL INFORMATION */}
                                    <section>
                                        <div className="mb-4 border-l-[3px] border-blue-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Procurement Project Details
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Description, project classification, and quantity.
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="pms-field">
                                                <Label
                                                    htmlFor="item_description"
                                                    className="flex items-center gap-2 text-base font-semibold text-slate-800"
                                                >
                                                    <span className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-sm font-bold text-white">
                                                        1
                                                    </span>

                                                    General Description and Objective
                                                </Label>

                                                <textarea
                                                    id="item_description"
                                                    value={
                                                        editorItem.description_objective
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'description_objective',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    rows={4}
                                                    placeholder="Describe the procurement requirement and its objective..."
                                                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    required
                                                />

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.description_objective`,
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="pms-field">
                                                <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                    <span className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-sm font-bold text-white">
                                                        2
                                                    </span>

                                                    Project Type
                                                </Label>

                                                <select
                                                    value={
                                                        editorItem.project_type
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'project_type',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className="h-9 w-full border border-input bg-background px-3 text-sm"
                                                    required
                                                >
                                                    <option value="">
                                                        Select project type
                                                    </option>

                                                    <option value="Goods">
                                                        Goods
                                                    </option>

                                                    <option value="Infrastructure Projects">
                                                        Infrastructure Projects
                                                    </option>

                                                    <option value="Consulting Services">
                                                        Consulting Services
                                                    </option>

                                                    <option value="Other">
                                                        Other
                                                    </option>
                                                </select>

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.project_type`,
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="pms-field">
                                                <Label
                                                    htmlFor="quantity_size"
                                                    className="flex items-center gap-2 text-base font-semibold text-slate-800"
                                                >
                                                    <span className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-sm font-bold text-white">
                                                        3
                                                    </span>

                                                    Quantity and Size of the Project to be Procured
                                                </Label>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    List the quantity, unit, item, and relevant specifications. Group items by lot when applicable.
                                                </p>

                                                <textarea
                                                    id="quantity_size"
                                                    value={
                                                        editorItem.quantity_size
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'quantity_size',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    rows={8}
                                                    placeholder={`Lot 1:
38 units Laptop
5 units Desktop
2 units 2K Lumens Projector
1 unit 5K Lumens Projector

Lot 2:
1 unit Heavy Duty Book Scanner`}
                                                    className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    required
                                                />
                                            </div>

                                            <div className="pms-field">
                                                <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                    <span className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-sm font-bold text-white">
                                                        4
                                                    </span>

                                                    Recommended Mode of Procurement
                                                </Label>

                                                <Input
                                                    value={
                                                        editorItem.recommended_mode_of_procurement
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'recommended_mode_of_procurement',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="Mode of procurement"
                                                />
                                            </div>

                                            <div className="pms-field">
                                                <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                    <span className="inline-flex h-7 w-7 items-center justify-center bg-blue-600 text-sm font-bold text-white">
                                                        5
                                                    </span>

                                                    Pre-Procurement Conference
                                                </Label>

                                                <select
                                                    value={
                                                        editorItem.pre_procurement_conference
                                                            ? '1'
                                                            : '0'
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'pre_procurement_conference',
                                                            event
                                                                .target
                                                                .value ===
                                                                '1',
                                                        )
                                                    }
                                                    className="h-9 w-full border border-input bg-background px-3 text-sm"
                                                >
                                                    <option value="0">
                                                        No
                                                    </option>

                                                    <option value="1">
                                                        Yes
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* SCHEDULE */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-amber-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Projected Timeline
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Planned procurement period and expected delivery.
                                            </div>
                                        </div>

                                        <div className="pms-field">
                                            <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-amber-600 text-sm font-bold text-white">
                                                    6
                                                </span>

                                                Start of Procurement Activity
                                            </Label>

                                            <Input
                                                type="month"
                                                value={
                                                    editorItem.procurement_start_month
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateEditorItem(
                                                        'procurement_start_month',
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                                            />
                                        </div>

                                        <div className="pms-field">
                                            <Label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-amber-600 text-sm font-bold text-white">
                                                    7
                                                </span>

                                                End of Procurement Activity
                                            </Label>

                                            <Input
                                                type="month"
                                                value={
                                                    editorItem.procurement_end_month
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateEditorItem(
                                                        'procurement_end_month',
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                                            />
                                        </div>

                                        <div className="pms-field">
                                            <Label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-amber-600 text-sm font-bold text-white">
                                                    8
                                                </span>

                                                Expected Delivery / Implementation Period
                                            </Label>

                                            <Input
                                                type="month"
                                                value={
                                                    editorItem.expected_delivery_month
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateEditorItem(
                                                        'expected_delivery_month',
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                                            />
                                        </div>
                                    </section>

                                    {/* FUNDING */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-violet-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Funding Details
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Funding source and estimated procurement cost.
                                            </div>
                                        </div>

                                        <div className="pms-field">
                                            <Label className="flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-violet-600 text-sm font-bold text-white">
                                                    9
                                                </span>

                                                Source of Funds
                                            </Label>

                                            <Input
                                                value={
                                                    editorItem.source_of_funds
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateEditorItem(
                                                        'source_of_funds',
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Source of funds"
                                            />
                                        </div>

                                        <div className="pms-field">
                                            <Label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-violet-600 text-sm font-bold text-white">
                                                    10
                                                </span>

                                                Estimated Budget / Authorized Budgetary Allocation (PhP)
                                            </Label>

                                            <div className="relative">
                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                                    ₱
                                                </span>

                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="pl-8 text-right text-base font-bold tabular-nums"
                                                    value={formatBudgetInput(
                                                        editorItem.estimated_budget,
                                                    )}
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'estimated_budget',
                                                            sanitizeBudgetInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        updateEditorItem(
                                                            'estimated_budget',
                                                            normalizeBudgetInput(
                                                                editorItem.estimated_budget,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            {editingIndex !==
                                                null && (
                                                <InputError
                                                    message={errorFor(
                                                        `items.${editingIndex}.estimated_budget`,
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </section>

                                    {/* ATTACHMENTS / REMARKS */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-sky-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Attachments and Remarks
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Supporting documents and additional procurement notes.
                                            </div>
                                        </div>

                                        <div className="pms-field">
                                            <Label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-sky-600 text-sm font-bold text-white">
                                                    11
                                                </span>

                                                Supporting Documents
                                            </Label>

                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                {editorItem.id
                                                    ? 'Supporting documents for this existing item are managed from the PPMP Details page.'
                                                    : 'Save the PPMP changes first before uploading supporting documents for this new item.'}
                                            </p>
                                        </div>

                                        <div className="pms-field">
                                            <Label className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-800">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-sky-600 text-sm font-bold text-white">
                                                    12
                                                </span>

                                                Remarks
                                            </Label>

                                            <textarea
                                                value={
                                                    editorItem.remarks
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateEditorItem(
                                                        'remarks',
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                rows={4}
                                                placeholder="Optional remarks..."
                                                className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* EDITOR FOOTER */}
                            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/25 px-5 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={
                                        closeItemEditor
                                    }
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    onClick={
                                        saveEditorItem
                                    }
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {editingIndex !==
                                    null
                                        ? 'Save Item Changes'
                                        : 'Add Item'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </AppLayout>
    );
}
