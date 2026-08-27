// resources/js/pages/purchase-requests/create.tsx

import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { PageHeader } from '@/components/pms/page-header';
import { SectionCard } from '@/components/pms/section-card';
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
    FileText,
    Plus,
} from 'lucide-react';
import {
    FormEventHandler,
    useMemo,
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

    const amount =
        parseNumber(value);

    return amount.toFixed(2);
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
): string {
    if (value.length <= 65) {
        return value;
    }

    return `${value.slice(0, 65)}...`;
}

const inputClass =
    'w-full rounded-md border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

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
            title:
                'Purchase Requests',
            href:
                '/purchase-requests',
        },
        {
            title:
                ppmp.ppmp_no,
            href:
                `/ppmps/${ppmp.id}`,
        },
        {
            title: 'Create PR',
            href:
                `/ppmps/${ppmp.id}/purchase-requests/create`,
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
                defaults
                    .requested_by_name,

            requested_by_designation:
                defaults
                    .requested_by_designation,

            approved_by_name:
                defaults
                    .approved_by_name,

            approved_by_designation:
                defaults
                    .approved_by_designation,

            items: [
                createEmptyItem(),
            ],
        });

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

    /*
     * Track the current draft amount against
     * every selected PPMP item.
     */
    const draftUsageBySource =
        useMemo(() => {
            const usage:
                Record<
                    string,
                    number
                > = {};

            data.items.forEach(
                (item, index) => {
                    if (
                        !item.ppmp_item_id
                    ) {
                        return;
                    }

                    usage[
                        item
                            .ppmp_item_id
                    ] =
                        (
                            usage[
                                item
                                    .ppmp_item_id
                            ] ?? 0
                        ) +
                        lineTotals[
                            index
                        ];
                },
            );

            return usage;
        }, [
            data.items,
            lineTotals,
        ]);

    function addItem() {
        setData(
            'items',
            [
                ...data.items,
                createEmptyItem(),
            ],
        );
    }

    function removeItem(
        index: number,
    ) {
        if (
            data.items.length ===
            1
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

    function updateItem<
        K extends PrItemField,
    >(
        index: number,
        field: K,
        value: PrItemForm[K],
    ) {
        const items =
            [...data.items];

        items[index] = {
            ...items[index],
            [field]: value,
        };

        setData(
            'items',
            items,
        );
    }

    function selectPpmpItem(
        index: number,
        value: string,
    ) {
        const source =
            ppmp.items.find(
                (item) =>
                    String(item.id) ===
                    value,
            );

        const items =
            [...data.items];

        const current =
            items[index];

        items[index] = {
            ...current,

            ppmp_item_id:
                value,

            item_description:
                current
                    .item_description ||
                source
                    ?.description_objective ||
                '',
        };

        setData(
            'items',
            items,
        );
    }

    function sourceFor(
        ppmpItemId: string,
    ):
        | PpmpSourceItem
        | undefined {
        return ppmp.items.find(
            (item) =>
                String(item.id) ===
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
                className="pms-page"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement"
                    title="Create Purchase Request"
                    description={`Create a GAM Appendix 60 Purchase Request based on approved ${ppmp.ppmp_no}.`}
                    icon={FileText}
                    actions={
                        <div className="border-l-2 border-primary pl-4 text-right">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Total Amount
                            </div>

                            <div className="mt-0.5 text-xl font-semibold tabular-nums text-primary">
                                {formatCurrency(
                                    totalAmount,
                                )}
                            </div>
                        </div>
                    }
                />

                {/* SOURCE PPMP */}
                <SectionCard
                    title="Source PPMP"
                    description="This Purchase Request will be charged against the approved PPMP shown below."
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* PPMP NUMBER */}
                        <div className="pms-readonly">
                            <div className="pms-readonly-label">
                                PPMP No.
                            </div>

                            <div className="pms-readonly-value">
                                {
                                    ppmp.ppmp_no
                                }
                            </div>
                        </div>

                        {/* FISCAL YEAR */}
                        <div className="pms-readonly">
                            <div className="pms-readonly-label">
                                Fiscal
                                Year
                            </div>

                            <div className="pms-readonly-value">
                                {
                                    ppmp.fiscal_year
                                }
                            </div>
                        </div>

                        {/* TOTAL BUDGET */}
                        <div className="pms-readonly">
                            <div className="pms-readonly-label">
                                PPMP
                                Budget
                            </div>

                            <div className="pms-readonly-value text-primary">
                                {formatCurrency(
                                    ppmp.total_budget,
                                )}
                            </div>
                        </div>

                        {/* UTILIZATION */}
                        <div className="pms-readonly">
                            <div className="pms-readonly-label">
                                Approved
                                PR
                                Utilization
                            </div>

                            <div className="pms-readonly-value">
                                {formatCurrency(
                                    ppmp.approved_pr_total,
                                )}
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* PURCHASE REQUEST INFORMATION */}
                <SectionCard
                    title="Purchase Request Information"
                    description="Enter the information required for the GAM Appendix 60 Purchase Request form."
                >
                    <div className="mb-5 rounded-xl border bg-primary/5 px-4 py-4 text-center">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Department
                            of Science
                            and
                            Technology
                        </div>

                        <div className="mt-1 text-lg font-bold tracking-wide text-foreground">
                            PURCHASE
                            REQUEST
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                            GAM Appendix
                            60
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {/* ENTITY NAME */}
                        <div className="pms-field">
                            <Label
                                htmlFor="entity_name"
                            >
                                Entity
                                Name
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

                        {/* FUND CLUSTER */}
                        <div className="pms-field">
                            <Label
                                htmlFor="fund_cluster"
                            >
                                Fund
                                Cluster
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

                        {/* OFFICE */}
                        <div className="pms-field">
                            <Label>
                                Office /
                                Section
                            </Label>

                            <div className="pms-readonly">
                                <div className="pms-readonly-value">
                                    {
                                        ppmp
                                            .office
                                            .code
                                    }
                                </div>

                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    {
                                        ppmp
                                            .office
                                            .name
                                    }
                                </div>
                            </div>
                        </div>

                        {/* PR NUMBER */}
                        <div className="pms-field">
                            <Label>
                                PR No.
                            </Label>

                            <div className="pms-readonly">
                                <div className="pms-readonly-value text-muted-foreground">
                                    Automatically
                                    assigned
                                    after
                                    saving
                                </div>
                            </div>
                        </div>

                        {/* RESPONSIBILITY CENTER */}
                        <div className="pms-field">
                            <Label
                                htmlFor="responsibility_center_code"
                            >
                                Responsibility
                                Center
                                Code
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

                        {/* DATE */}
                        <div className="pms-field">
                            <Label
                                htmlFor="pr_date"
                            >
                                Date
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
                </SectionCard>

                {/* PURCHASE REQUEST ITEMS */}
                <SectionCard
                    title="Purchase Request Items"
                    description="Add the items included in this request and select the approved PPMP budget source for each item."
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={
                                addItem
                            }
                        >
                            <Plus className="size-4" />

                            Add Item
                        </Button>
                    }
                    contentClassName="p-0"
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-[1900px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="w-[320px] px-3 py-3 text-left">
                                        PPMP
                                        Budget
                                        Source
                                    </th>

                                    <th className="w-[150px] px-3 py-3 text-left">
                                        Stock /
                                        Property
                                        No.
                                    </th>

                                    <th className="w-[120px] px-3 py-3 text-left">
                                        Unit
                                    </th>

                                    <th className="w-[360px] px-3 py-3 text-left">
                                        Item
                                        Description
                                    </th>

                                    <th className="w-[140px] px-3 py-3 text-right">
                                        Quantity
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-right">
                                        Unit
                                        Cost
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-right">
                                        Total
                                        Cost
                                    </th>

                                    <th className="w-[100px] px-3 py-3 text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {data.items.map(
                                    (
                                        item,
                                        index,
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
                                                className="align-top transition-colors hover:bg-muted/20"
                                            >
                                                {/* PPMP SOURCE */}
                                                <td className="p-2">
                                                    <select
                                                        value={
                                                            item.ppmp_item_id
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            selectPpmpItem(
                                                                index,
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="">
                                                            Select
                                                            PPMP
                                                            Item
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
                                                                        0
                                                                    }
                                                                >
                                                                    #
                                                                    {
                                                                        sourceItem.sort_order
                                                                    }{' '}
                                                                    -{' '}
                                                                    {shortDescription(
                                                                        sourceItem.description_objective,
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

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.ppmp_item_id`,
                                                        )}
                                                    />

                                                    {source && (
                                                        <div
                                                            className={`mt-2 rounded-lg border p-3 text-xs leading-5 ${
                                                                overBudget
                                                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'
                                                                    : 'border-blue-100 bg-blue-50/50 text-muted-foreground dark:border-blue-900 dark:bg-blue-950/20'
                                                            }`}
                                                        >
                                                            <div className="grid gap-1">
                                                                <div className="flex justify-between gap-3">
                                                                    <span>
                                                                        PPMP
                                                                        Budget
                                                                    </span>

                                                                    <span className="font-semibold">
                                                                        {formatCurrency(
                                                                            source.estimated_budget,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-3">
                                                                    <span>
                                                                        Already
                                                                        Used
                                                                    </span>

                                                                    <span className="font-semibold">
                                                                        {formatCurrency(
                                                                            source.approved_pr_amount,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-3">
                                                                    <span>
                                                                        Remaining
                                                                    </span>

                                                                    <span className="font-semibold">
                                                                        {formatCurrency(
                                                                            source.remaining_balance,
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between gap-3 border-t pt-1">
                                                                    <span>
                                                                        This
                                                                        Draft
                                                                    </span>

                                                                    <span className="font-semibold">
                                                                        {formatCurrency(
                                                                            usage,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {overBudget && (
                                                                <div className="mt-2 border-t border-red-200 pt-2 font-medium dark:border-red-900">
                                                                    This
                                                                    draft
                                                                    exceeds
                                                                    the
                                                                    remaining
                                                                    PPMP
                                                                    balance
                                                                    and
                                                                    cannot
                                                                    be
                                                                    approved
                                                                    unless
                                                                    adjusted.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* STOCK PROPERTY NO */}
                                                <td className="p-2">
                                                    <Input
                                                        value={
                                                            item.stock_property_no
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'stock_property_no',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.stock_property_no`,
                                                        )}
                                                    />
                                                </td>

                                                {/* UNIT */}
                                                <td className="p-2">
                                                    <Input
                                                        value={
                                                            item.unit
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'unit',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="unit"
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.unit`,
                                                        )}
                                                    />
                                                </td>

                                                {/* DESCRIPTION */}
                                                <td className="p-2">
                                                    <textarea
                                                        value={
                                                            item.item_description
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'item_description',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        rows={
                                                            5
                                                        }
                                                        className={
                                                            inputClass
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.item_description`,
                                                        )}
                                                    />
                                                </td>

                                                {/* QUANTITY */}
                                                <td className="p-2">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="text-right"
                                                        value={
                                                            item.quantity
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'quantity',
                                                                sanitizeQuantityInput(
                                                                    event
                                                                        .target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        placeholder="0"
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.quantity`,
                                                        )}
                                                    />
                                                </td>

                                                {/* UNIT COST */}
                                                <td className="p-2">
                                                    <div className="relative">
                                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            ₱
                                                        </span>

                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="pl-7 text-right"
                                                            value={formatMoneyInput(
                                                                item.unit_cost,
                                                            )}
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateItem(
                                                                    index,
                                                                    'unit_cost',
                                                                    sanitizeMoneyInput(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                updateItem(
                                                                    index,
                                                                    'unit_cost',
                                                                    normalizeMoneyInput(
                                                                        item.unit_cost,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder="0.00"
                                                        />
                                                    </div>

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.unit_cost`,
                                                        )}
                                                    />
                                                </td>

                                                {/* TOTAL COST */}
                                                <td className="whitespace-nowrap p-2 text-right">
                                                    <div className="rounded-lg border bg-primary/5 px-3 py-2 font-semibold text-primary">
                                                        {formatCurrency(
                                                            lineTotals[
                                                                index
                                                            ] ??
                                                                0,
                                                        )}
                                                    </div>
                                                </td>

                                                {/* REMOVE */}
                                                <td className="p-2 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            data
                                                                .items
                                                                .length ===
                                                            1
                                                        }
                                                        onClick={() =>
                                                            removeItem(
                                                                index,
                                                            )
                                                        }
                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                                    >
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>

                            <tfoot className="border-t bg-primary/5">
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        className="px-4 py-4 text-right text-sm font-semibold"
                                    >
                                        TOTAL
                                        AMOUNT
                                    </td>

                                    <td className="whitespace-nowrap px-4 py-4 text-right text-base font-bold text-primary">
                                        {formatCurrency(
                                            totalAmount,
                                        )}
                                    </td>

                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </SectionCard>

                {/* PURPOSE */}
                <SectionCard
                    title="Purpose"
                    description="Briefly describe why these items are being requested."
                >
                    <div className="pms-field">
                        <Label
                            htmlFor="purpose"
                        >
                            Purpose of
                            Purchase
                            Request
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
                            className={
                                inputClass
                            }
                            placeholder="Enter the purpose of this Purchase Request..."
                        />

                        <InputError
                            message={
                                errors.purpose
                            }
                        />
                    </div>
                </SectionCard>

                {/* SIGNATORIES */}
                <SectionCard
                    title="Request and Approval Signatories"
                    description="Enter the names and designations that will appear on the official Purchase Request form."
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* REQUESTED BY */}
                        <div className="space-y-4 border border-border bg-secondary/20 p-4">
                            <div>
                                <h3 className="font-semibold">
                                    Requested
                                    By
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Usually
                                    the
                                    Division
                                    Chief or
                                    Head of
                                    the
                                    requesting
                                    unit.
                                </p>
                            </div>

                            <div className="pms-field">
                                <Label
                                    htmlFor="requested_by_name"
                                >
                                    Printed
                                    Name
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
                                <Label
                                    htmlFor="requested_by_designation"
                                >
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

                        {/* APPROVED BY */}
                        <div className="space-y-4 border border-border bg-secondary/20 p-4">
                            <div>
                                <h3 className="font-semibold">
                                    Approved
                                    By
                                </h3>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    This is
                                    the
                                    printed
                                    signatory
                                    on the
                                    official
                                    PR and is
                                    separate
                                    from the
                                    system
                                    approval
                                    action.
                                </p>
                            </div>

                            <div className="pms-field">
                                <Label
                                    htmlFor="approved_by_name"
                                >
                                    Printed
                                    Name
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
                                <Label
                                    htmlFor="approved_by_designation"
                                >
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
                </SectionCard>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div>
                            <span className="text-sm text-muted-foreground">
                                Total PR
                                Amount:{' '}
                            </span>

                            <span className="font-semibold text-primary">
                                {formatCurrency(
                                    totalAmount,
                                )}
                            </span>
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
                        {processing
                            ? 'Saving Draft...'
                            : 'Save as Draft'}
                    </Button>
                </ActionBar>
            </form>
        </AppLayout>
    );
}
