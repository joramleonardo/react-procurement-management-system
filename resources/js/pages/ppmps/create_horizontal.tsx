import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { DataTableShell } from '@/components/pms/data-table-shell';
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
    ClipboardList,
    Plus,
    Trash2,
} from 'lucide-react';
import {
    type FormEventHandler,
    useMemo,
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

interface CreateProps {
    office: Office;
    coordinator: Coordinator;
    currentFiscalYear: number;
}

type PpmpItemForm = {
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
    plan_type: string;

    prepared_by_name: string;
    prepared_by_position: string;

    submitted_by_name: string;
    submitted_by_position: string;

    items: PpmpItemForm[];
};

type ItemField = keyof PpmpItemForm;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PPMP',
        href: '/ppmps',
    },
    {
        title: 'Create PPMP',
        href: '/ppmps/create',
    },
];

const itemInputClass =
    'w-full border border-input bg-background px-2 py-2 text-sm outline-none';

function createEmptyItem(): PpmpItemForm {
    return {
        description_objective: '',
        project_type: '',
        quantity_size: '',
        recommended_mode_of_procurement: '',
        pre_procurement_conference: false,
        procurement_start_month: '',
        procurement_end_month: '',
        expected_delivery_month: '',
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

    const amount = Number(
        value.replace(/,/g, ''),
    );

    if (
        !Number.isFinite(amount)
    ) {
        return '';
    }

    return amount.toFixed(2);
}

export default function CreatePpmp({
    office,
    coordinator,
    currentFiscalYear,
}: CreateProps) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
    } = useForm<PpmpFormData>({
        fiscal_year:
            currentFiscalYear,

        plan_type:
            'indicative',

        prepared_by_name:
            coordinator.name,

        prepared_by_position:
            coordinator.position_title ??
            '',

        submitted_by_name: '',
        submitted_by_position: '',

        items: [
            createEmptyItem(),
        ],
    });

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
        K extends ItemField,
    >(
        index: number,
        field: K,
        value: PpmpItemForm[K],
    ) {
        const items = [
            ...data.items,
        ];

        items[index] = {
            ...items[index],
            [field]: value,
        };

        setData(
            'items',
            items,
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

            post('/ppmps', {
                preserveScroll:
                    true,
            });
        };

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head title="Create PPMP" />

            <form
                onSubmit={submit}
                className="pms-page bg-background"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Planning"
                    title="Create PPMP"
                    description="Create a Project Procurement Management Plan and save the initial record as a draft."
                    icon={
                        ClipboardList
                    }
                    actions={
                        <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Current Total
                                Budget
                            </div>

                            <div className="mt-1 text-xl font-bold tabular-nums text-primary">
                                {formatCurrency(
                                    totalBudget,
                                )}
                            </div>
                        </div>
                    }
                />

                <div className="space-y-5 p-4 md:p-6">
                    {/* PPMP INFORMATION */}
                    <section className="border border-border bg-card">
                        <div className="border-b border-border bg-secondary/35 px-5 py-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                Basic Information
                            </div>

                            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-base font-bold">
                                        PPMP Information
                                    </h2>

                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        The PPMP number
                                        will be generated
                                        automatically
                                        after the draft
                                        is saved.
                                    </p>
                                </div>

                                <div className="mt-2 border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 sm:mt-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    Draft
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 xl:grid-cols-4">
                            {/* FISCAL YEAR */}
                            <div className="border-b border-border p-5 md:border-r xl:border-b-0">
                                <div className="pms-field">
                                    <Label htmlFor="fiscal_year">
                                        Fiscal Year
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
                                        required
                                    />

                                    <InputError
                                        message={
                                            errors.fiscal_year
                                        }
                                    />
                                </div>
                            </div>

                            {/* PPMP TYPE */}
                            <div className="border-b border-border p-5 xl:border-b-0 xl:border-r">
                                <div className="pms-field">
                                    <Label htmlFor="plan_type">
                                        PPMP Type
                                    </Label>

                                    <select
                                        id="plan_type"
                                        value={
                                            data.plan_type
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setData(
                                                'plan_type',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="h-9 w-full border border-input bg-background px-3 text-sm"
                                        required
                                    >
                                        <option value="indicative">
                                            Indicative
                                        </option>

                                        <option value="final">
                                            Final
                                        </option>
                                    </select>

                                    <InputError
                                        message={
                                            errors.plan_type
                                        }
                                    />
                                </div>
                            </div>

                            {/* OFFICE */}
                            <div className="border-b border-border bg-blue-50/30 p-5 md:border-r xl:border-b-0 dark:bg-blue-950/10">
                                <div className="pms-readonly-label">
                                    End-User /
                                    Implementing Unit
                                </div>

                                <div className="mt-2 text-base font-bold text-primary">
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
                            <div className="bg-violet-50/30 p-5 dark:bg-violet-950/10">
                                <div className="pms-readonly-label">
                                    PPMP Coordinator
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
                        </div>
                    </section>

                    {/* PROCUREMENT PROJECT DETAILS */}
                    <section className="border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b border-border bg-secondary/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                    PPMP Items
                                </div>

                                <h2 className="mt-1 text-base font-bold">
                                    Procurement Project
                                    Details
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Add all procurement
                                    projects,
                                    activities,
                                    schedules, and
                                    estimated budgets
                                    included in this
                                    PPMP.
                                </p>
                            </div>

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
                        </div>

                        <DataTableShell>
                            <table className="pms-table min-w-[2460px]">
                                <thead>
                                    <tr>
                                        <th className="w-[300px]">
                                            1. General
                                            Description and
                                            Objective
                                        </th>

                                        <th className="w-[190px]">
                                            2. Project Type
                                        </th>

                                        <th className="w-[200px]">
                                            3. Quantity and
                                            Size
                                        </th>

                                        <th className="w-[220px]">
                                            4. Recommended
                                            Mode
                                        </th>

                                        <th className="w-[170px]">
                                            5. Pre-
                                            Procurement
                                            Conference
                                        </th>

                                        <th className="w-[155px]">
                                            6. Start
                                        </th>

                                        <th className="w-[155px]">
                                            7. End
                                        </th>

                                        <th className="w-[165px]">
                                            8. Expected
                                            Delivery
                                        </th>

                                        <th className="w-[190px]">
                                            9. Source of
                                            Funds
                                        </th>

                                        <th className="w-[190px] text-right">
                                            10. Estimated
                                            Budget
                                        </th>

                                        <th className="w-[210px]">
                                            11. Supporting
                                            Documents
                                        </th>

                                        <th className="w-[230px]">
                                            12. Remarks
                                        </th>

                                        <th className="w-[100px] text-center">
                                            Action
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
                                                    index
                                                }
                                                className="align-top"
                                            >
                                                {/* DESCRIPTION */}
                                                <td>
                                                    <textarea
                                                        value={
                                                            item.description_objective
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'description_objective',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        rows={
                                                            5
                                                        }
                                                        placeholder="Enter the general description and procurement objective..."
                                                        className={
                                                            itemInputClass
                                                        }
                                                        required
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.description_objective`,
                                                        )}
                                                    />
                                                </td>

                                                {/* PROJECT TYPE */}
                                                <td>
                                                    <select
                                                        value={
                                                            item.project_type
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'project_type',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        className={
                                                            itemInputClass
                                                        }
                                                        required
                                                    >
                                                        <option value="">
                                                            Select
                                                            project type
                                                        </option>

                                                        <option value="Goods">
                                                            Goods
                                                        </option>

                                                        <option value="Infrastructure Projects">
                                                            Infrastructure
                                                            Projects
                                                        </option>

                                                        <option value="Consulting Services">
                                                            Consulting
                                                            Services
                                                        </option>

                                                        <option value="Other">
                                                            Other
                                                        </option>
                                                    </select>

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.project_type`,
                                                        )}
                                                    />
                                                </td>

                                                {/* QUANTITY */}
                                                <td>
                                                    <textarea
                                                        value={
                                                            item.quantity_size
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'quantity_size',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        rows={
                                                            5
                                                        }
                                                        placeholder="Example: 10 units"
                                                        className={
                                                            itemInputClass
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.quantity_size`,
                                                        )}
                                                    />
                                                </td>

                                                {/* MODE */}
                                                <td>
                                                    <Input
                                                        value={
                                                            item.recommended_mode_of_procurement
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'recommended_mode_of_procurement',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Mode of procurement"
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.recommended_mode_of_procurement`,
                                                        )}
                                                    />
                                                </td>

                                                {/* PRE PROCUREMENT */}
                                                <td>
                                                    <select
                                                        value={
                                                            item.pre_procurement_conference
                                                                ? '1'
                                                                : '0'
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'pre_procurement_conference',
                                                                event
                                                                    .target
                                                                    .value ===
                                                                    '1',
                                                            )
                                                        }
                                                        className={
                                                            itemInputClass
                                                        }
                                                    >
                                                        <option value="0">
                                                            No
                                                        </option>

                                                        <option value="1">
                                                            Yes
                                                        </option>
                                                    </select>
                                                </td>

                                                {/* START */}
                                                <td>
                                                    <Input
                                                        type="month"
                                                        value={
                                                            item.procurement_start_month
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'procurement_start_month',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.procurement_start_month`,
                                                        )}
                                                    />
                                                </td>

                                                {/* END */}
                                                <td>
                                                    <Input
                                                        type="month"
                                                        value={
                                                            item.procurement_end_month
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'procurement_end_month',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.procurement_end_month`,
                                                        )}
                                                    />
                                                </td>

                                                {/* DELIVERY */}
                                                <td>
                                                    <Input
                                                        type="month"
                                                        value={
                                                            item.expected_delivery_month
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'expected_delivery_month',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.expected_delivery_month`,
                                                        )}
                                                    />
                                                </td>

                                                {/* SOURCE OF FUNDS */}
                                                <td>
                                                    <Input
                                                        value={
                                                            item.source_of_funds
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'source_of_funds',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Source of funds"
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.source_of_funds`,
                                                        )}
                                                    />
                                                </td>

                                                {/* BUDGET */}
                                                <td>
                                                    <div className="relative">
                                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                                                            ₱
                                                        </span>

                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            className="pl-7 text-right font-semibold tabular-nums"
                                                            value={formatBudgetInput(
                                                                item.estimated_budget,
                                                            )}
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateItem(
                                                                    index,
                                                                    'estimated_budget',
                                                                    sanitizeBudgetInput(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                updateItem(
                                                                    index,
                                                                    'estimated_budget',
                                                                    normalizeBudgetInput(
                                                                        item.estimated_budget,
                                                                    ),
                                                                )
                                                            }
                                                            placeholder="0.00"
                                                            required
                                                        />
                                                    </div>

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.estimated_budget`,
                                                        )}
                                                    />
                                                </td>

                                                {/* DOCUMENTS */}
                                                <td>
                                                    <div className="border border-dashed border-border bg-secondary/25 p-3 text-xs leading-5 text-muted-foreground">
                                                        Supporting
                                                        documents can
                                                        be uploaded
                                                        after the PPMP
                                                        draft has been
                                                        saved.
                                                    </div>
                                                </td>

                                                {/* REMARKS */}
                                                <td>
                                                    <textarea
                                                        value={
                                                            item.remarks
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateItem(
                                                                index,
                                                                'remarks',
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        rows={
                                                            5
                                                        }
                                                        placeholder="Optional remarks"
                                                        className={
                                                            itemInputClass
                                                        }
                                                    />

                                                    <InputError
                                                        message={errorFor(
                                                            `items.${index}.remarks`,
                                                        )}
                                                    />
                                                </td>

                                                {/* REMOVE */}
                                                <td className="text-center">
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
                                                        className="text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        <Trash2 className="size-4" />

                                                        <span className="sr-only">
                                                            Remove item
                                                        </span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>

                                <tfoot className="pms-total-row">
                                    <tr>
                                        <td
                                            colSpan={
                                                9
                                            }
                                            className="text-right text-xs font-bold uppercase tracking-[0.08em]"
                                        >
                                            Total PPMP
                                            Budget
                                        </td>

                                        <td className="whitespace-nowrap text-right text-base font-bold tabular-nums text-primary">
                                            {formatCurrency(
                                                totalBudget,
                                            )}
                                        </td>

                                        <td
                                            colSpan={
                                                3
                                            }
                                        />
                                    </tr>
                                </tfoot>
                            </table>
                        </DataTableShell>

                        <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-5 py-3">
                            <div className="text-xs text-muted-foreground">
                                {
                                    data.items
                                        .length
                                }{' '}
                                procurement item
                                {data.items
                                    .length ===
                                1
                                    ? ''
                                    : 's'}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={
                                    addItem
                                }
                            >
                                <Plus className="size-4" />

                                Add Another Item
                            </Button>
                        </div>
                    </section>

                    {/* SIGNATORIES */}
                    <section className="border border-border bg-card">
                        <div className="border-b border-border bg-secondary/35 px-5 py-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                                Signatories
                            </div>

                            <h2 className="mt-1 text-base font-bold">
                                Prepared and
                                Submitted By
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Record the
                                personnel
                                information that
                                will appear on
                                the official PPMP.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2">
                            {/* PREPARED BY */}
                            <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                                <div className="mb-4 border-l-[3px] border-blue-500 pl-3">
                                    <div className="text-sm font-bold">
                                        Prepared By
                                    </div>

                                    <div className="mt-1 text-xs text-muted-foreground">
                                        PPMP
                                        Coordinator
                                    </div>
                                </div>

                                <div className="space-y-4">
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
                                            Position /
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
                            <div className="p-5">
                                <div className="mb-4 border-l-[3px] border-violet-500 pl-3">
                                    <div className="text-sm font-bold">
                                        Submitted By
                                    </div>

                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Division
                                        Chief / Head
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="pms-field">
                                        <Label htmlFor="submitted_by_name">
                                            Division
                                            Chief / Head
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
                                            Position /
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
                    </section>
                </div>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                Total PPMP Budget
                            </div>

                            <div className="mt-1 text-lg font-bold tabular-nums text-primary">
                                {formatCurrency(
                                    totalBudget,
                                )}
                            </div>
                        </div>
                    }
                >
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                    >
                        <Link href="/ppmps">
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
