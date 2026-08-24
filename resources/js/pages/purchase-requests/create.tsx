import InputError from '@/components/input-error';
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

type PrItemField =
    keyof PrItemForm;

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
     * Total amount currently being drafted
     * against each PPMP item.
     *
     * One PPMP item may fund multiple PR lines.
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
        setData('items', [
            ...data.items,
            createEmptyItem(),
        ]);
    }

    function removeItem(
        index: number,
    ) {
        if (
            data.items.length === 1
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
                className="flex flex-1 flex-col gap-6 p-4"
            >
                {/* HEADER */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Create Purchase
                            Request
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            GAM Appendix 60
                            Purchase Request
                            based on approved{' '}
                            {
                                ppmp.ppmp_no
                            }.
                        </p>
                    </div>

                    <div className="text-left lg:text-right">
                        <div className="text-sm text-muted-foreground">
                            Total Amount
                        </div>

                        <div className="text-2xl font-bold">
                            {formatCurrency(
                                totalAmount,
                            )}
                        </div>
                    </div>
                </div>

                {/* SOURCE PPMP */}
                <section className="rounded-xl border bg-background p-5">
                    <h2 className="text-lg font-semibold">
                        Source PPMP
                    </h2>

                    <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="text-xs text-muted-foreground">
                                PPMP No.
                            </div>

                            <div className="font-medium">
                                {
                                    ppmp.ppmp_no
                                }
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground">
                                Fiscal Year
                            </div>

                            <div className="font-medium">
                                {
                                    ppmp.fiscal_year
                                }
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground">
                                PPMP Budget
                            </div>

                            <div className="font-medium">
                                {formatCurrency(
                                    ppmp.total_budget,
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground">
                                Approved PR
                                Utilization
                            </div>

                            <div className="font-medium">
                                {formatCurrency(
                                    ppmp.approved_pr_total,
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* GAM HEADER */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="border-b pb-4 text-center">
                        <div className="text-sm font-medium">
                            DEPARTMENT OF
                            SCIENCE AND
                            TECHNOLOGY
                        </div>

                        <h2 className="mt-2 text-xl font-bold">
                            PURCHASE REQUEST
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                            GAM Appendix 60
                        </p>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <div className="grid gap-2">
                            <Label>
                                Entity Name
                            </Label>

                            <Input
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

                        <div className="grid gap-2">
                            <Label>
                                Fund Cluster
                            </Label>

                            <Input
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
                            />

                            <InputError
                                message={
                                    errors.fund_cluster
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>
                                Office /
                                Section
                            </Label>

                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                <div className="font-medium">
                                    {
                                        ppmp
                                            .office
                                            .code
                                    }
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    {
                                        ppmp
                                            .office
                                            .name
                                    }
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>
                                PR No.
                            </Label>

                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                Automatically
                                assigned after
                                saving
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="responsibility_center_code"
                            >
                                Responsibility
                                Center Code
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
                            />

                            <InputError
                                message={
                                    errors.responsibility_center_code
                                }
                            />
                        </div>

                        <div className="grid gap-2">
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
                </section>

                {/* PR ITEMS */}
                <section className="overflow-hidden rounded-xl border bg-background">
                    <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Purchase
                                Request Items
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Each item must
                                identify the
                                approved PPMP
                                item that funds
                                the purchase.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={
                                addItem
                            }
                        >
                            + Add Item
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[1900px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="w-[320px] px-3 py-3 text-left">
                                        PPMP Budget
                                        Source
                                    </th>

                                    <th className="w-[150px] px-3 py-3 text-left">
                                        Stock /
                                        Property No.
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
                                        Unit Cost
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-right">
                                        Total Cost
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
                                                className="align-top"
                                            >
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
                                                            className={`mt-2 rounded-md border p-2 text-xs ${
                                                                overBudget
                                                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
                                                                    : 'bg-muted/30 text-muted-foreground'
                                                            }`}
                                                        >
                                                            <div>
                                                                Approved
                                                                PPMP
                                                                budget:{' '}
                                                                <span className="font-medium">
                                                                    {formatCurrency(
                                                                        source.estimated_budget,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                Already
                                                                used:{' '}
                                                                <span className="font-medium">
                                                                    {formatCurrency(
                                                                        source.approved_pr_amount,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                Remaining:{' '}
                                                                <span className="font-medium">
                                                                    {formatCurrency(
                                                                        source.remaining_balance,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                This
                                                                draft:{' '}
                                                                <span className="font-medium">
                                                                    {formatCurrency(
                                                                        usage,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {overBudget && (
                                                                <div className="mt-2 font-medium">
                                                                    Draft
                                                                    amount
                                                                    exceeds
                                                                    the
                                                                    remaining
                                                                    PPMP
                                                                    balance.
                                                                    It
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

                                                <td className="p-2">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="text-right"
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

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.unit_cost`,
                                                        )}
                                                    />
                                                </td>

                                                <td className="whitespace-nowrap p-2 text-right">
                                                    <div className="rounded-md bg-muted/40 px-3 py-2 font-semibold">
                                                        {formatCurrency(
                                                            lineTotals[
                                                                index
                                                            ] ??
                                                                0,
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
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
                                                        className="rounded-md border px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>

                            <tfoot className="border-t bg-muted/30">
                                <tr>
                                    <td
                                        colSpan={
                                            6
                                        }
                                        className="px-4 py-4 text-right font-semibold"
                                    >
                                        TOTAL
                                        AMOUNT
                                    </td>

                                    <td className="px-4 py-4 text-right text-base font-bold">
                                        {formatCurrency(
                                            totalAmount,
                                        )}
                                    </td>

                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* PURPOSE */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="grid gap-2">
                        <Label
                            htmlFor="purpose"
                        >
                            Purpose
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
                                    event.target
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
                </section>

                {/* REQUESTED / APPROVED */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold">
                                Requested By
                            </h3>

                            <p className="text-xs text-muted-foreground">
                                Printed name and
                                designation that
                                will appear on
                                the PR form.
                            </p>

                            <div className="grid gap-2">
                                <Label>
                                    Printed Name
                                </Label>

                                <Input
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

                            <div className="grid gap-2">
                                <Label>
                                    Designation
                                </Label>

                                <Input
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

                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold">
                                Approved By
                            </h3>

                            <p className="text-xs text-muted-foreground">
                                This records the
                                name printed on
                                the physical PR;
                                system approval
                                remains a
                                separate
                                workflow action.
                            </p>

                            <div className="grid gap-2">
                                <Label>
                                    Printed Name
                                </Label>

                                <Input
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

                            <div className="grid gap-2">
                                <Label>
                                    Designation
                                </Label>

                                <Input
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
                </section>

                {/* ACTION BAR */}
                <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-background/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="text-sm text-muted-foreground">
                            Total PR
                            Amount:{' '}
                        </span>

                        <span className="font-bold">
                            {formatCurrency(
                                totalAmount,
                            )}
                        </span>
                    </div>

                    <div className="flex gap-3">
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
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
