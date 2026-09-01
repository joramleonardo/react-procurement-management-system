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

type Office = {
    id: number;
    code: string;
    name: string;
};

type PpmpSourceItem = {
    id: number;
    sort_order: number;
    description_objective: string;
    project_type: string;
    quantity_size: string;
    source_of_funds: string;
    estimated_budget: string;
    approved_pr_amount: string;
    remaining_balance: string;
};

type Ppmp = {
    id: number;
    ppmp_no: string;
    fiscal_year: number;
    total_budget: string;
    approved_pr_total: string;

    office: Office;

    items: PpmpSourceItem[];
};

type Defaults = {
    entity_name: string;
    pr_date: string;

    requested_by_name: string;
    requested_by_designation: string;

    approved_by_name: string;
    approved_by_designation: string;
};

type CreateProps = {
    ppmp: Ppmp;
    defaults: Defaults;
};

type PrItemForm = {
    ppmp_item_id: string;
    stock_property_no: string;
    unit: string;
    item_description: string;
    quantity: string;
    unit_cost: string;
};

type PurchaseRequestFormData = {
    entity_name: string;
    fund_cluster: string;
    responsibility_center_code: string;
    pr_date: string;

    purpose: string;

    requested_by_name: string;
    requested_by_designation: string;

    approved_by_name: string;
    approved_by_designation: string;

    items: PrItemForm[];
};

type PrItemField = keyof PrItemForm;

type CreateTab =
    | 'information'
    | 'items'
    | 'signatories';

function createEmptyItem(): PrItemForm {
    return {
        ppmp_item_id: '',
        stock_property_no: '',
        unit: '',
        item_description: '',
        quantity: '',
        unit_cost: '',
    };
}

function isItemBlank(
    item: PrItemForm,
): boolean {
    return (
        !item.ppmp_item_id &&
        !item.stock_property_no &&
        !item.unit &&
        !item.item_description &&
        !item.quantity &&
        !item.unit_cost
    );
}

function parseNumber(
    value: string,
): number {
    const amount = Number(
        value.replace(/,/g, ''),
    );

    return Number.isFinite(amount)
        ? amount
        : 0;
}

function formatCurrency(
    value: number | string,
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
        typeof value === 'string'
            ? parseNumber(value)
            : value,
    );
}

function sanitizeMoneyInput(
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

    if (cleaned.includes('.')) {
        return `${whole}.${decimal}`;
    }

    return whole;
}

function formatMoneyInput(
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

function normalizeMoneyInput(
    value: string,
): string {
    if (!value) {
        return '';
    }

    return parseNumber(
        value,
    ).toFixed(2);
}

function sanitizeQuantityInput(
    value: string,
): string {
    const cleaned =
        value.replace(
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
            .slice(0, 3);

    if (cleaned.includes('.')) {
        return `${whole}.${decimal}`;
    }

    return whole;
}

function shortDescription(
    value: string,
    length = 70,
): string {
    if (
        value.length <= length
    ) {
        return value;
    }

    return `${value.slice(
        0,
        length,
    )}...`;
}

export default function CreatePurchaseRequest({
    ppmp,
    defaults,
}: CreateProps) {
    const breadcrumbs:
        BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Purchase Requests',
            href: '/purchase-requests',
        },
        {
            title: ppmp.ppmp_no,
            href: `/ppmps/${ppmp.id}`,
        },
        {
            title: 'Create PR',
            href: `/ppmps/${ppmp.id}/purchase-requests/create`,
        },
    ];

    const {
        data,
        setData,
        post,
        processing,
        errors,
    } =
        useForm<PurchaseRequestFormData>({
            entity_name:
                defaults.entity_name,

            fund_cluster: '',

            responsibility_center_code:
                '',

            pr_date:
                defaults.pr_date,

            purpose: '',

            requested_by_name:
                defaults.requested_by_name,

            requested_by_designation:
                defaults.requested_by_designation,

            approved_by_name:
                defaults.approved_by_name,

            approved_by_designation:
                defaults.approved_by_designation,

            items: [
                createEmptyItem(),
            ],
        });

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<CreateTab>(
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
        useState<PrItemForm>(
            createEmptyItem(),
        );

    const [
        editorError,
        setEditorError,
    ] =
        useState<string | null>(
            null,
        );

    const lineTotals =
        useMemo(
            () =>
                data.items.map(
                    (item) =>
                        parseNumber(
                            item.quantity,
                        ) *
                        parseNumber(
                            item.unit_cost,
                        ),
                ),
            [data.items],
        );

    const totalAmount =
        useMemo(
            () =>
                lineTotals.reduce(
                    (
                        total,
                        amount,
                    ) =>
                        total +
                        amount,
                    0,
                ),
            [lineTotals],
        );

    const overallRemaining =
        Math.max(
            0,
            parseNumber(
                ppmp.total_budget,
            ) -
                parseNumber(
                    ppmp.approved_pr_total,
                ),
        );

    /*
     * Draft PR usage grouped by source PPMP item.
     * This does not alter approved utilization.
     */
    const draftUsageBySource =
        useMemo(() => {
            const usage:
                Record<
                    string,
                    number
                > = {};

            data.items.forEach(
                (
                    item,
                    index,
                ) => {
                    if (
                        !item.ppmp_item_id
                    ) {
                        return;
                    }

                    usage[
                        item.ppmp_item_id
                    ] =
                        (
                            usage[
                                item.ppmp_item_id
                            ] ?? 0
                        ) +
                        (
                            lineTotals[
                                index
                            ] ?? 0
                        );
                },
            );

            return usage;
        }, [
            data.items,
            lineTotals,
        ]);

    const meaningfulItems =
        useMemo(
            () =>
                data.items
                    .map(
                        (
                            item,
                            index,
                        ) => ({
                            item,
                            index,
                        }),
                    )
                    .filter(
                        ({ item }) =>
                            !isItemBlank(
                                item,
                            ),
                    ),
            [data.items],
        );

    function sourceFor(
        ppmpItemId: string,
    ):
        | PpmpSourceItem
        | undefined {
        return ppmp.items.find(
            (item) =>
                String(
                    item.id,
                ) ===
                ppmpItemId,
        );
    }

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
     * Move the user to the correct workspace tab
     * when Laravel returns validation errors.
     */
    useEffect(() => {
        const keys =
            Object.keys(
                errors,
            );

        const itemError =
            keys.find(
                (key) =>
                    /^items\.\d+\./.test(
                        key,
                    ),
            );

        if (itemError) {
            setActiveTab(
                'items',
            );

            const match =
                itemError.match(
                    /^items\.(\d+)\./,
                );

            if (match) {
                const index =
                    Number(
                        match[1],
                    );

                const item =
                    data.items[
                        index
                    ];

                if (item) {
                    setEditingIndex(
                        index,
                    );

                    setEditorItem({
                        ...item,
                    });

                    setItemEditorOpen(
                        true,
                    );
                }
            }

            return;
        }

        const signatoryFields = [
            'purpose',
            'requested_by_name',
            'requested_by_designation',
            'approved_by_name',
            'approved_by_designation',
        ];

        if (
            keys.some(
                (key) =>
                    signatoryFields.includes(
                        key,
                    ),
            )
        ) {
            setActiveTab(
                'signatories',
            );

            return;
        }

        if (keys.length > 0) {
            setActiveTab(
                'information',
            );
        }
    }, [errors]);

    function updateEditorItem<
        K extends PrItemField,
    >(
        field: K,
        value: PrItemForm[K],
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

    function selectEditorPpmpItem(
        value: string,
    ) {
        const source =
            sourceFor(
                value,
            );

        setEditorItem(
            (
                current,
            ) => ({
                ...current,

                ppmp_item_id:
                    value,

                item_description:
                    current.item_description ||
                    source
                        ?.description_objective ||
                    '',
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
            !editorItem.ppmp_item_id
        ) {
            setEditorError(
                'Please select the source PPMP item.',
            );

            return;
        }

        if (
            !editorItem.item_description.trim()
        ) {
            setEditorError(
                'Please enter the item description.',
            );

            return;
        }

        if (
            !editorItem.quantity
        ) {
            setEditorError(
                'Please enter the quantity.',
            );

            return;
        }

        if (
            !editorItem.unit_cost
        ) {
            setEditorError(
                'Please enter the unit cost.',
            );

            return;
        }

        const normalized:
            PrItemForm = {
            ...editorItem,

            unit_cost:
                normalizeMoneyInput(
                    editorItem.unit_cost,
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
                normalized;

            setData(
                'items',
                items,
            );
        } else if (
            data.items.length ===
                1 &&
            isItemBlank(
                data.items[0],
            )
        ) {
            /*
             * Replace the initial placeholder row.
             */
            setData(
                'items',
                [
                    normalized,
                ],
            );
        } else {
            setData(
                'items',
                [
                    ...data.items,
                    normalized,
                ],
            );
        }

        closeItemEditor();
    }

    function removeItem(
        index: number,
    ) {
        const confirmed =
            window.confirm(
                'Remove this item from the Purchase Request?',
            );

        if (!confirmed) {
            return;
        }

        if (
            data.items.length ===
            1
        ) {
            setData(
                'items',
                [
                    createEmptyItem(),
                ],
            );

            return;
        }

        const remaining =
            data.items.filter(
                (
                    _,
                    itemIndex,
                ) =>
                    itemIndex !==
                    index,
            );

        setData(
            'items',
            remaining.length >
                0
                ? remaining
                : [
                      createEmptyItem(),
                  ],
        );
    }

    /*
     * Calculate the projected draft usage while
     * the Add/Edit drawer is open.
     */
    const editorLineTotal =
        parseNumber(
            editorItem.quantity,
        ) *
        parseNumber(
            editorItem.unit_cost,
        );

    const editorSource =
        sourceFor(
            editorItem.ppmp_item_id,
        );

    let editorProjectedUsage =
        editorItem.ppmp_item_id
            ? draftUsageBySource[
                  editorItem.ppmp_item_id
              ] ?? 0
            : 0;

    if (
        editingIndex !==
        null
    ) {
        const originalItem =
            data.items[
                editingIndex
            ];

        if (
            originalItem &&
            originalItem.ppmp_item_id ===
                editorItem.ppmp_item_id
        ) {
            editorProjectedUsage -=
                lineTotals[
                    editingIndex
                ] ?? 0;
        }
    }

    editorProjectedUsage +=
        editorLineTotal;

    const editorRemaining =
        editorSource
            ? parseNumber(
                  editorSource.remaining_balance,
              )
            : 0;

    const editorOverBudget =
        editorSource !==
            undefined &&
        editorProjectedUsage >
            editorRemaining;

    const submit:
        FormEventHandler<HTMLFormElement> =
        (event) => {
            event.preventDefault();

            post(
                `/ppmps/${ppmp.id}/purchase-requests`,
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
            <Head title="Create Purchase Request" />

            <form
                onSubmit={submit}
                className="pms-page bg-background"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement"
                    title="Create Purchase Request"
                    description={`Prepare a GAM Appendix 60 Purchase Request based on approved ${ppmp.ppmp_no}.`}
                    icon={
                        FileText
                    }
                    actions={
                        <div className="min-w-[190px] text-right">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Current PR Total
                            </div>

                            <div className="mt-1 text-2xl font-bold tabular-nums text-primary">
                                {formatCurrency(
                                    totalAmount,
                                )}
                            </div>
                        </div>
                    }
                />

                <div className="mx-auto w-full max-w-[1680px] p-4 md:p-6">
                    <section className="border border-border bg-card">
                        {/* SOURCE SUMMARY */}
                        <div className="grid border-b border-border bg-secondary/25 sm:grid-cols-2 xl:grid-cols-6">
                            {/* PPMP */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Source PPMP
                                </div>

                                <Link
                                    href={`/ppmps/${ppmp.id}`}
                                    className="mt-1 inline-block font-bold text-blue-700 hover:underline dark:text-blue-300"
                                >
                                    {
                                        ppmp.ppmp_no
                                    }
                                </Link>
                            </div>

                            {/* OFFICE */}
                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Office
                                </div>

                                <div className="mt-1 text-sm font-bold text-primary">
                                    {
                                        ppmp.office.code
                                    }
                                </div>
                            </div>

                            {/* FY */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Fiscal Year
                                </div>

                                <div className="mt-1 text-sm font-bold">
                                    {
                                        ppmp.fiscal_year
                                    }
                                </div>
                            </div>

                            {/* PPMP BUDGET */}
                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP Budget
                                </div>

                                <div className="mt-1 text-sm font-bold tabular-nums text-blue-700 dark:text-blue-300">
                                    {formatCurrency(
                                        ppmp.total_budget,
                                    )}
                                </div>
                            </div>

                            {/* APPROVED USAGE */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Approved PR Use
                                </div>

                                <div className="mt-1 text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                                    {formatCurrency(
                                        ppmp.approved_pr_total,
                                    )}
                                </div>
                            </div>

                            {/* REMAINING */}
                            <div className="px-4 py-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP Remaining
                                </div>

                                <div className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {formatCurrency(
                                        overallRemaining,
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* TABS */}
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
                                        PR Information
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
                                                PR Items
                                            </div>
                                        </div>

                                        <span className="text-lg font-bold tabular-nums text-emerald-600">
                                            {
                                                meaningfulItems.length
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
                                        Purpose & Signatories
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="min-h-[430px]">
                            {/* ============================
                                INFORMATION TAB
                            ============================ */}
                            {activeTab ===
                                'information' && (
                                <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
                                    <div className="border-b border-border xl:border-b-0 xl:border-r">
                                        <div className="border-b border-border bg-blue-50/40 px-5 py-4 dark:bg-blue-950/10">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700 dark:text-blue-300">
                                                GAM Appendix 60
                                            </div>

                                            <h2 className="mt-1 text-base font-bold">
                                                Purchase Request Information
                                            </h2>

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Complete the identifying information for this Purchase Request.
                                            </p>
                                        </div>

                                        <div className="grid md:grid-cols-2 xl:grid-cols-3">
                                            {/* ENTITY */}
                                            <div className="border-b border-border p-5 md:border-r">
                                                <div className="pms-field">
                                                    <Label htmlFor="entity_name">
                                                        Entity Name
                                                    </Label>

                                                    <Input
                                                        id="entity_name"
                                                        value={
                                                            data.entity_name
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'entity_name',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.entity_name
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* FUND CLUSTER */}
                                            <div className="border-b border-border p-5 xl:border-r">
                                                <div className="pms-field">
                                                    <Label htmlFor="fund_cluster">
                                                        Fund Cluster
                                                    </Label>

                                                    <Input
                                                        id="fund_cluster"
                                                        value={
                                                            data.fund_cluster
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'fund_cluster',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Enter fund cluster"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.fund_cluster
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* OFFICE */}
                                            <div className="border-b border-border bg-blue-50/25 p-5 md:border-r xl:border-r-0 dark:bg-blue-950/10">
                                                <div className="pms-readonly-label">
                                                    Office / Section
                                                </div>

                                                <div className="mt-2 text-lg font-bold text-primary">
                                                    {
                                                        ppmp.office.code
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {
                                                        ppmp.office.name
                                                    }
                                                </div>
                                            </div>

                                            {/* RESPONSIBILITY */}
                                            <div className="border-b border-border p-5 md:border-r">
                                                <div className="pms-field">
                                                    <Label htmlFor="responsibility_center_code">
                                                        Responsibility Center Code
                                                    </Label>

                                                    <Input
                                                        id="responsibility_center_code"
                                                        value={
                                                            data.responsibility_center_code
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'responsibility_center_code',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Enter responsibility center code"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.responsibility_center_code
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* DATE */}
                                            <div className="border-b border-border p-5 xl:border-r">
                                                <div className="pms-field">
                                                    <Label htmlFor="pr_date">
                                                        PR Date
                                                    </Label>

                                                    <Input
                                                        id="pr_date"
                                                        type="date"
                                                        value={
                                                            data.pr_date
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'pr_date',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.pr_date
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* PR NUMBER */}
                                            <div className="border-b border-border bg-slate-50/70 p-5 dark:bg-slate-900/30">
                                                <div className="pms-readonly-label">
                                                    PR No.
                                                </div>

                                                <div className="mt-2 text-sm font-bold text-muted-foreground">
                                                    Automatically assigned
                                                </div>

                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Generated after the draft is saved.
                                                </div>
                                            </div>

                                            {/* SOURCE INFO */}
                                            <div className="p-5 md:col-span-2 xl:col-span-3">
                                                <div className="flex gap-3 border-l-[3px] border-primary bg-primary/5 px-4 py-3">
                                                    <FileText className="mt-0.5 size-4 shrink-0 text-primary" />

                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary">
                                                            Source PPMP
                                                        </div>

                                                        <Link
                                                            href={`/ppmps/${ppmp.id}`}
                                                            className="mt-1 inline-block font-bold text-blue-700 hover:underline dark:text-blue-300"
                                                        >
                                                            {
                                                                ppmp.ppmp_no
                                                            }
                                                        </Link>

                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            Every PR item must reference an approved procurement item from this PPMP.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BUDGET GUIDE */}
                                    <aside className="bg-secondary/15">
                                        <div className="border-b border-border px-5 py-4">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                                Budget Overview
                                            </div>

                                            <h3 className="mt-1 text-sm font-bold">
                                                Source PPMP Utilization
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-border">
                                            <div className="border-l-[3px] border-blue-500 px-5 py-4">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Original PPMP Budget
                                                </div>

                                                <div className="mt-2 text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                                                    {formatCurrency(
                                                        ppmp.total_budget,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-l-[3px] border-amber-500 px-5 py-4">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Approved PR Utilization
                                                </div>

                                                <div className="mt-2 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                                                    {formatCurrency(
                                                        ppmp.approved_pr_total,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-l-[3px] border-emerald-500 bg-emerald-50/40 px-5 py-4 dark:bg-emerald-950/10">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Remaining PPMP Budget
                                                </div>

                                                <div className="mt-2 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                    {formatCurrency(
                                                        overallRemaining,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-l-[3px] border-violet-500 px-5 py-4">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Current Draft PR
                                                </div>

                                                <div className="mt-2 text-xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
                                                    {formatCurrency(
                                                        totalAmount,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            )}

                            {/* ============================
                                ITEMS TAB
                            ============================ */}
                            {activeTab ===
                                'items' && (
                                <div>
                                    <div className="flex flex-col gap-3 border-b border-border bg-emerald-50/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-950/10">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                                Purchase Request Items
                                            </div>

                                            <h2 className="mt-1 text-base font-bold">
                                                Items to be Requested
                                            </h2>

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Select an approved PPMP item as the budget source for every PR line.
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

                                            Add PR Item
                                        </Button>
                                    </div>

                                    {meaningfulItems.length ===
                                    0 ? (
                                        <div className="grid min-h-[330px] place-items-center p-6">
                                            <div className="max-w-md text-center">
                                                <div className="mx-auto flex size-14 items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                    <ClipboardList className="size-6" />
                                                </div>

                                                <h3 className="mt-4 text-base font-bold">
                                                    No PR items added
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    Add the first item and assign it to an available approved PPMP budget source.
                                                </p>

                                                <Button
                                                    type="button"
                                                    onClick={
                                                        openNewItem
                                                    }
                                                    className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    <Plus className="size-4" />

                                                    Add First Item
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="max-h-[420px] overflow-auto">
                                                <table className="pms-table min-w-[1150px]">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr>
                                                            <th className="w-[55px]">
                                                                #
                                                            </th>

                                                            <th className="w-[320px]">
                                                                PR Item
                                                            </th>

                                                            <th className="w-[250px]">
                                                                PPMP Source
                                                            </th>

                                                            <th className="w-[110px]">
                                                                Unit
                                                            </th>

                                                            <th className="w-[120px] text-right">
                                                                Qty
                                                            </th>

                                                            <th className="w-[160px] text-right">
                                                                Unit Cost
                                                            </th>

                                                            <th className="w-[170px] text-right">
                                                                Total Cost
                                                            </th>

                                                            <th className="w-[120px] text-center">
                                                                Actions
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {meaningfulItems.map(
                                                            (
                                                                {
                                                                    item,
                                                                    index,
                                                                },
                                                                visibleIndex,
                                                            ) => {
                                                                const source =
                                                                    sourceFor(
                                                                        item.ppmp_item_id,
                                                                    );

                                                                const usage =
                                                                    item.ppmp_item_id
                                                                        ? draftUsageBySource[
                                                                              item.ppmp_item_id
                                                                          ] ??
                                                                          0
                                                                        : 0;

                                                                const remaining =
                                                                    source
                                                                        ? parseNumber(
                                                                              source.remaining_balance,
                                                                          )
                                                                        : 0;

                                                                const overBudget =
                                                                    source !==
                                                                        undefined &&
                                                                    usage >
                                                                        remaining;

                                                                return (
                                                                    <tr
                                                                        key={
                                                                            index
                                                                        }
                                                                    >
                                                                        <td className="text-center text-xs font-bold text-muted-foreground">
                                                                            {visibleIndex +
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
                                                                                    {item.item_description ||
                                                                                        'Untitled PR item'}
                                                                                </div>

                                                                                {item.stock_property_no && (
                                                                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                                                                        Stock/Property:{' '}
                                                                                        {
                                                                                            item.stock_property_no
                                                                                        }
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        </td>

                                                                        <td>
                                                                            {source ? (
                                                                                <div>
                                                                                    <div className="font-semibold text-foreground">
                                                                                        #
                                                                                        {
                                                                                            source.sort_order
                                                                                        }{' '}
                                                                                        ·{' '}
                                                                                        {shortDescription(
                                                                                            source.description_objective,
                                                                                            42,
                                                                                        )}
                                                                                    </div>

                                                                                    <div
                                                                                        className={`mt-1 text-[10px] font-semibold ${
                                                                                            overBudget
                                                                                                ? 'text-red-600'
                                                                                                : 'text-emerald-600'
                                                                                        }`}
                                                                                    >
                                                                                        Remaining:{' '}
                                                                                        {formatCurrency(
                                                                                            source.remaining_balance,
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                '—'
                                                                            )}
                                                                        </td>

                                                                        <td>
                                                                            {item.unit ||
                                                                                '—'}
                                                                        </td>

                                                                        <td className="text-right tabular-nums">
                                                                            {item.quantity ||
                                                                                '—'}
                                                                        </td>

                                                                        <td className="text-right tabular-nums">
                                                                            {formatCurrency(
                                                                                item.unit_cost ||
                                                                                    0,
                                                                            )}
                                                                        </td>

                                                                        <td className="text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                                            {formatCurrency(
                                                                                lineTotals[
                                                                                    index
                                                                                ] ??
                                                                                    0,
                                                                            )}
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
                                                                );
                                                            },
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* TOTAL */}
                                            <div className="grid border-t border-border bg-secondary/20 sm:grid-cols-[1fr_auto]">
                                                <div className="flex items-center px-5 py-4 text-xs text-muted-foreground">
                                                    {
                                                        meaningfulItems.length
                                                    }{' '}
                                                    PR item
                                                    {meaningfulItems.length ===
                                                    1
                                                        ? ''
                                                        : 's'}{' '}
                                                    included in this draft.
                                                </div>

                                                <div className="flex items-center gap-4 border-t border-border px-5 py-4 sm:border-l sm:border-t-0">
                                                    <div className="text-right">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                            Total PR Amount
                                                        </div>

                                                        <div className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                            {formatCurrency(
                                                                totalAmount,
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

                            {/* ============================
                                PURPOSE / SIGNATORIES TAB
                            ============================ */}
                            {activeTab ===
                                'signatories' && (
                                <div>
                                    <div className="border-b border-border bg-violet-50/35 px-5 py-4 dark:bg-violet-950/10">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-violet-700 dark:text-violet-300">
                                            Purpose & Signatories
                                        </div>

                                        <h2 className="mt-1 text-base font-bold">
                                            Purchase Request Certification
                                        </h2>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Record the purpose and printed signatories for the official PR.
                                        </p>
                                    </div>

                                    {/* PURPOSE */}
                                    <div className="border-b border-border p-5">
                                        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
                                            <div className="border-l-[3px] border-amber-500 pl-3">
                                                <div className="text-sm font-bold">
                                                    Purpose
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Briefly explain why these items are being requested.
                                                </p>
                                            </div>

                                            <div className="pms-field">
                                                <Label htmlFor="purpose">
                                                    Purpose of Purchase Request
                                                </Label>

                                                <textarea
                                                    id="purpose"
                                                    value={
                                                        data.purpose
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        setData(
                                                            'purpose',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    rows={4}
                                                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    placeholder="Enter the purpose of this Purchase Request..."
                                                />

                                                <InputError
                                                    message={
                                                        errors.purpose
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* SIGNATORIES */}
                                    <div className="grid md:grid-cols-2">
                                        {/* REQUESTED */}
                                        <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                                            <div className="mb-5 flex items-center gap-3 border-l-[3px] border-blue-500 bg-blue-50/40 px-4 py-3 dark:bg-blue-950/10">
                                                <div className="flex size-9 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                                                    <UsersRound className="size-4" />
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold">
                                                        Requested By
                                                    </div>

                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        Requesting Unit Signatory
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="pms-field">
                                                    <Label htmlFor="requested_by_name">
                                                        Printed Name
                                                    </Label>

                                                    <Input
                                                        id="requested_by_name"
                                                        value={
                                                            data.requested_by_name
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'requested_by_name',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.requested_by_name
                                                        }
                                                    />
                                                </div>

                                                <div className="pms-field">
                                                    <Label htmlFor="requested_by_designation">
                                                        Designation
                                                    </Label>

                                                    <Input
                                                        id="requested_by_designation"
                                                        value={
                                                            data.requested_by_designation
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'requested_by_designation',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Division Chief"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.requested_by_designation
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* APPROVED */}
                                        <div className="p-5">
                                            <div className="mb-5 flex items-center gap-3 border-l-[3px] border-violet-500 bg-violet-50/40 px-4 py-3 dark:bg-violet-950/10">
                                                <div className="flex size-9 items-center justify-center border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-400">
                                                    <UsersRound className="size-4" />
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold">
                                                        Approved By
                                                    </div>

                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        Printed PR Signatory
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="pms-field">
                                                    <Label htmlFor="approved_by_name">
                                                        Printed Name
                                                    </Label>

                                                    <Input
                                                        id="approved_by_name"
                                                        value={
                                                            data.approved_by_name
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'approved_by_name',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.approved_by_name
                                                        }
                                                    />
                                                </div>

                                                <div className="pms-field">
                                                    <Label htmlFor="approved_by_designation">
                                                        Designation
                                                    </Label>

                                                    <Input
                                                        id="approved_by_designation"
                                                        value={
                                                            data.approved_by_designation
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setData(
                                                                'approved_by_designation',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Director"
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.approved_by_designation
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
                                    'Confirm the PR information and source PPMP before adding request items.'}

                                {activeTab ===
                                    'items' &&
                                    `${meaningfulItems.length} item${
                                        meaningfulItems.length ===
                                        1
                                            ? ''
                                            : 's'
                                    } currently included · ${formatCurrency(
                                        totalAmount,
                                    )}.`}

                                {activeTab ===
                                    'signatories' &&
                                    'Review the purpose and printed signatories before saving the PR draft.'}
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

                {/* STICKY ACTION BAR */}
                <ActionBar
                    left={
                        <div className="flex items-center gap-4">
                            <div className="flex size-10 items-center justify-center border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-400">
                                <CircleDollarSign className="size-5" />
                            </div>

                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Total PR Amount
                                </div>

                                <div className="mt-0.5 text-lg font-bold tabular-nums text-primary">
                                    {formatCurrency(
                                        totalAmount,
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
                            processing
                        }
                    >
                        <Save className="size-4" />

                        {processing
                            ? 'Saving Draft...'
                            : 'Save as Draft'}
                    </Button>
                </ActionBar>

                {/* ============================
                    ITEM EDITOR DRAWER
                ============================ */}
                {itemEditorOpen && (
                    <div className="fixed inset-0 z-50 bg-black/30">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-label={
                                editingIndex !==
                                null
                                    ? 'Edit Purchase Request item'
                                    : 'Add Purchase Request item'
                            }
                            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-border bg-background"
                        >
                            {/* DRAWER HEADER */}
                            <div className="flex items-start justify-between gap-4 border-b border-border bg-emerald-50/50 px-5 py-4 dark:bg-emerald-950/15">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700 dark:text-emerald-300">
                                        Purchase Request Item
                                    </div>

                                    <h2 className="mt-1 text-lg font-bold">
                                        {editingIndex !==
                                        null
                                            ? 'Edit PR Item'
                                            : 'Add PR Item'}
                                    </h2>

                                    <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(
                                            editorLineTotal,
                                        )}
                                    </div>
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

                            {/* DRAWER BODY */}
                            <div className="flex-1 overflow-y-auto">
                                {editorError && (
                                    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                        {
                                            editorError
                                        }
                                    </div>
                                )}

                                <div className="space-y-6 p-5 md:p-6">
                                    {/* SOURCE PPMP ITEM */}
                                    <section>
                                        <div className="mb-4 border-l-[3px] border-blue-500 pl-3">
                                            <div className="text-sm font-bold">
                                                PPMP Budget Source
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Select the approved PPMP item that will fund this PR line.
                                            </div>
                                        </div>

                                        <div className="pms-field">
                                            <Label>
                                                Source PPMP Item
                                            </Label>

                                            <select
                                                value={
                                                    editorItem.ppmp_item_id
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    selectEditorPpmpItem(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="h-10 w-full border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="">
                                                    Select approved PPMP item
                                                </option>

                                                {ppmp.items.map(
                                                    (
                                                        sourceItem,
                                                    ) => (
                                                        <option
                                                            key={
                                                                sourceItem.id
                                                            }
                                                            value={
                                                                sourceItem.id
                                                            }
                                                            disabled={
                                                                parseNumber(
                                                                    sourceItem.remaining_balance,
                                                                ) <=
                                                                0 &&
                                                                String(
                                                                    sourceItem.id,
                                                                ) !==
                                                                    editorItem.ppmp_item_id
                                                            }
                                                        >
                                                            #
                                                            {
                                                                sourceItem.sort_order
                                                            }{' '}
                                                            —{' '}
                                                            {shortDescription(
                                                                sourceItem.description_objective,
                                                                55,
                                                            )}{' '}
                                                            (
                                                            {formatCurrency(
                                                                sourceItem.remaining_balance,
                                                            )}{' '}
                                                            remaining)
                                                        </option>
                                                    ),
                                                )}
                                            </select>

                                            {editingIndex !==
                                                null && (
                                                <InputError
                                                    message={errorFor(
                                                        `items.${editingIndex}.ppmp_item_id`,
                                                    )}
                                                />
                                            )}
                                        </div>

                                        {/* BUDGET PANEL */}
                                        {editorSource && (
                                            <div
                                                className={`mt-4 border ${
                                                    editorOverBudget
                                                        ? 'border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20'
                                                        : 'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/10'
                                                }`}
                                            >
                                                <div className="border-b border-current/10 px-4 py-3">
                                                    <div className="text-xs font-bold">
                                                        PPMP Item #{editorSource.sort_order}
                                                    </div>

                                                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        {
                                                            editorSource.description_objective
                                                        }
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4">
                                                    <div className="border-b border-r border-border/70 p-3 sm:border-b-0">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                                            PPMP Budget
                                                        </div>

                                                        <div className="mt-1 text-xs font-bold tabular-nums">
                                                            {formatCurrency(
                                                                editorSource.estimated_budget,
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="border-b border-border/70 p-3 sm:border-b-0 sm:border-r">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                                            Approved Used
                                                        </div>

                                                        <div className="mt-1 text-xs font-bold tabular-nums text-amber-600">
                                                            {formatCurrency(
                                                                editorSource.approved_pr_amount,
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="border-r border-border/70 p-3">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                                            Remaining
                                                        </div>

                                                        <div className="mt-1 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                            {formatCurrency(
                                                                editorSource.remaining_balance,
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="p-3">
                                                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                                            Draft Usage
                                                        </div>

                                                        <div
                                                            className={`mt-1 text-xs font-bold tabular-nums ${
                                                                editorOverBudget
                                                                    ? 'text-red-600'
                                                                    : 'text-violet-700 dark:text-violet-300'
                                                            }`}
                                                        >
                                                            {formatCurrency(
                                                                editorProjectedUsage,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {editorOverBudget && (
                                                    <div className="border-t border-red-300 px-4 py-3 text-xs font-semibold leading-5 text-red-700 dark:border-red-900 dark:text-red-300">
                                                        This draft usage exceeds the remaining PPMP item balance. The draft may still be saved, but approval must not proceed until the amount is corrected.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </section>

                                    {/* ITEM DETAILS */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-emerald-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Item Details
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Stock number, unit, and description appearing on the PR.
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="pms-field">
                                                <Label>
                                                    Stock / Property No.
                                                </Label>

                                                <Input
                                                    value={
                                                        editorItem.stock_property_no
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'stock_property_no',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="Optional"
                                                />

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.stock_property_no`,
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="pms-field">
                                                <Label>
                                                    Unit
                                                </Label>

                                                <Input
                                                    value={
                                                        editorItem.unit
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'unit',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="e.g. unit, box, lot"
                                                />

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.unit`,
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="pms-field sm:col-span-2">
                                                <Label>
                                                    Item Description
                                                </Label>

                                                <textarea
                                                    value={
                                                        editorItem.item_description
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'item_description',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    rows={4}
                                                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                    placeholder="Enter the item description..."
                                                />

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.item_description`,
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* QUANTITY AND COST */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-violet-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Quantity and Cost
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Total cost is calculated automatically from quantity × unit cost.
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="pms-field">
                                                <Label>
                                                    Quantity
                                                </Label>

                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={
                                                        editorItem.quantity
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateEditorItem(
                                                            'quantity',
                                                            sanitizeQuantityInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="text-right font-semibold tabular-nums"
                                                    placeholder="0"
                                                />

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.quantity`,
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <div className="pms-field">
                                                <Label>
                                                    Unit Cost
                                                </Label>

                                                <div className="relative">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                                        ₱
                                                    </span>

                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={formatMoneyInput(
                                                            editorItem.unit_cost,
                                                        )}
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateEditorItem(
                                                                'unit_cost',
                                                                sanitizeMoneyInput(
                                                                    event
                                                                        .target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            updateEditorItem(
                                                                'unit_cost',
                                                                normalizeMoneyInput(
                                                                    editorItem.unit_cost,
                                                                ),
                                                            )
                                                        }
                                                        className="pl-8 text-right font-semibold tabular-nums"
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.unit_cost`,
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-l-[3px] border-emerald-500 bg-emerald-50/40 px-4 py-4 dark:bg-emerald-950/10">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                    Line Total
                                                </div>

                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Quantity × Unit Cost
                                                </div>
                                            </div>

                                            <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                                {formatCurrency(
                                                    editorLineTotal,
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* DRAWER FOOTER */}
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
                                        : 'Add PR Item'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </AppLayout>
    );
}
