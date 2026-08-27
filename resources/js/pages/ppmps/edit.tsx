import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { DataTableShell } from '@/components/pms/data-table-shell';
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
    plan_type: string;

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
        fiscal_year: number;
        plan_type: string;

        prepared_by_name: string | null;
        prepared_by_position: string | null;

        submitted_by_name: string | null;
        submitted_by_position: string | null;

        office: Office;
        coordinator: Coordinator;

        items: PpmpItemForm[];
    };
}

function createEmptyItem(): PpmpItemForm {
    return {
        description_objective: '',
        project_type: '',
        quantity_size: '',
        recommended_mode_of_procurement: '',
        pre_procurement_conference:
            false,
        procurement_start_month: '',
        procurement_end_month: '',
        expected_delivery_month: '',
        source_of_funds: '',
        estimated_budget: '',
        remarks: '',
    };
}

type ItemField =
    Exclude<
        keyof PpmpItemForm,
        'id'
    >;

const inputClass =
    'w-full border border-input bg-background px-2 py-2 text-sm outline-none';

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

    if (cleaned.includes('.')) {
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

    if (!Number.isFinite(amount)) {
        return '';
    }

    return amount.toFixed(2);
}

export default function EditPpmp({
    ppmp,
}: EditProps) {
    const office = ppmp.office;
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
            title: ppmp.ppmp_no,
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

            plan_type:
                ppmp.plan_type,

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
                    }),
                ),
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
        K extends ItemField,
    >(
        index: number,
        field: K,
        value: PpmpItemForm[K],
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
                className="pms-page"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Planning"
                    title="Edit PPMP"
                    description={`Update procurement information and project details for ${ppmp.ppmp_no}.`}
                    icon={FileText}
                    actions={
                        <div className="border-l-2 border-primary pl-4 text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Total
                                Budget
                            </div>

                            <div className="mt-1 text-xl font-semibold tabular-nums text-primary">
                                {formatCurrency(
                                    totalBudget,
                                )}
                            </div>
                        </div>
                    }
                />

                {/* PPMP REFERENCE */}
                <section className="border-b border-border bg-secondary/30 px-5 py-3 md:px-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="pms-readonly-label">
                                PPMP No.
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {
                                    ppmp.ppmp_no
                                }
                            </div>
                        </div>

                        <div>
                            <div className="pms-readonly-label">
                                End-User
                                Unit
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {
                                    office.code
                                }
                            </div>
                        </div>

                        <div>
                            <div className="pms-readonly-label">
                                Coordinator
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {
                                    coordinator.name
                                }
                            </div>
                        </div>

                        <div>
                            <div className="pms-readonly-label">
                                Current
                                Item Count
                            </div>

                            <div className="mt-1 text-sm font-semibold tabular-nums">
                                {
                                    data
                                        .items
                                        .length
                                }
                            </div>
                        </div>
                    </div>
                </section>

                {/* PPMP INFORMATION */}
                <SectionCard
                    title="PPMP Information"
                    description="Update the fiscal year and PPMP classification. Office and coordinator information are controlled by the system."
                >
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {/* FISCAL YEAR */}
                        <div className="pms-field">
                            <Label
                                htmlFor="fiscal_year"
                            >
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
                                required
                            />

                            <InputError
                                message={
                                    errors.fiscal_year
                                }
                            />
                        </div>

                        {/* TYPE */}
                        <div className="pms-field">
                            <Label
                                htmlFor="plan_type"
                            >
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
                                className="h-9 border border-input bg-background px-3 text-sm"
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

                        {/* OFFICE */}
                        <div className="pms-field">
                            <Label>
                                End-User /
                                Implementing
                                Unit
                            </Label>

                            <div className="pms-readonly">
                                <div className="pms-readonly-value">
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
                        </div>

                        {/* COORDINATOR */}
                        <div className="pms-field">
                            <Label>
                                PPMP
                                Coordinator
                            </Label>

                            <div className="pms-readonly">
                                <div className="pms-readonly-value">
                                    {
                                        coordinator.name
                                    }
                                </div>

                                <div className="mt-1 text-xs text-muted-foreground">
                                    {coordinator.position_title ??
                                        'No position title'}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* PROCUREMENT PROJECT DETAILS */}
                <SectionCard
                    title="Procurement Project Details"
                    description="Update, add, or remove procurement projects included in this PPMP."
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
                    <DataTableShell>
                        <table className="pms-table min-w-[2400px]">
                            <thead>
                                <tr>
                                    <th className="w-[280px]">
                                        1.
                                        General
                                        Description
                                        and
                                        Objective
                                    </th>

                                    <th className="w-[190px]">
                                        2.
                                        Project
                                        Type
                                    </th>

                                    <th className="w-[200px]">
                                        3.
                                        Quantity
                                        and Size
                                    </th>

                                    <th className="w-[220px]">
                                        4.
                                        Recommended
                                        Mode
                                    </th>

                                    <th className="w-[160px]">
                                        5.
                                        Pre-
                                        Procurement
                                        Conference
                                    </th>

                                    <th className="w-[160px]">
                                        6. Start
                                    </th>

                                    <th className="w-[160px]">
                                        7. End
                                    </th>

                                    <th className="w-[170px]">
                                        8.
                                        Expected
                                        Delivery
                                    </th>

                                    <th className="w-[190px]">
                                        9. Source
                                        of Funds
                                    </th>

                                    <th className="w-[190px] text-right">
                                        10.
                                        Estimated
                                        Budget
                                    </th>

                                    <th className="w-[220px]">
                                        11.
                                        Supporting
                                        Documents
                                    </th>

                                    <th className="w-[230px]">
                                        12.
                                        Remarks
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
                                                item.id ??
                                                `new-${index}`
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
                                                        4
                                                    }
                                                    className={
                                                        inputClass
                                                    }
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
                                                        inputClass
                                                    }
                                                >
                                                    <option value="">
                                                        Select
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
                                                        4
                                                    }
                                                    placeholder="e.g. 10 units"
                                                    className={
                                                        inputClass
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

                                            {/* PRE-PROCUREMENT */}
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
                                                        inputClass
                                                    }
                                                >
                                                    <option value="0">
                                                        No
                                                    </option>

                                                    <option value="1">
                                                        Yes
                                                    </option>
                                                </select>

                                                <InputError
                                                    message={errorFor(
                                                        `items.${index}.pre_procurement_conference`,
                                                    )}
                                                />
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

                                            {/* FUNDS */}
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
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                        ₱
                                                    </span>

                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="pl-7 text-right"
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
                                                {item.id ? (
                                                    <div className="border border-dashed border-border bg-secondary/20 p-3 text-xs leading-5 text-muted-foreground">
                                                        Supporting
                                                        documents
                                                        for this
                                                        item are
                                                        managed
                                                        from the
                                                        PPMP
                                                        details
                                                        page.
                                                    </div>
                                                ) : (
                                                    <div className="border border-dashed border-border bg-secondary/20 p-3 text-xs leading-5 text-muted-foreground">
                                                        Save this
                                                        new item
                                                        before
                                                        uploading
                                                        supporting
                                                        documents.
                                                    </div>
                                                )}
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
                                                        4
                                                    }
                                                    className={
                                                        inputClass
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
                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    Remove
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
                                        className="text-right font-semibold"
                                    >
                                        TOTAL
                                        BUDGET
                                    </td>

                                    <td className="whitespace-nowrap text-right text-base font-semibold tabular-nums text-primary">
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
                </SectionCard>

                {/* SIGNATORIES */}
                <SectionCard
                    title="Prepared and Submitted By"
                    description="Update the signatory information that will appear on the official PPMP."
                    contentClassName="p-0"
                >
                    <div className="grid md:grid-cols-2">
                        {/* PREPARED BY */}
                        <div className="border-b border-border px-5 py-5 md:border-b-0 md:border-r md:px-6">
                            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                                Prepared By
                            </div>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                PPMP
                                Coordinator
                                or designated
                                preparer.
                            </p>

                            <div className="mt-5 grid gap-4">
                                <div className="pms-field">
                                    <Label
                                        htmlFor="prepared_by_name"
                                    >
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
                                    />

                                    <InputError
                                        message={
                                            errors.prepared_by_name
                                        }
                                    />
                                </div>

                                <div className="pms-field">
                                    <Label
                                        htmlFor="prepared_by_position"
                                    >
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
                        <div className="px-5 py-5 md:px-6">
                            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                                Submitted By
                            </div>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Division
                                Chief or
                                Head of the
                                End-User
                                Unit.
                            </p>

                            <div className="mt-5 grid gap-4">
                                <div className="pms-field">
                                    <Label
                                        htmlFor="submitted_by_name"
                                    >
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
                                        placeholder="Name of Division Chief"
                                    />

                                    <InputError
                                        message={
                                            errors.submitted_by_name
                                        }
                                    />
                                </div>

                                <div className="pms-field">
                                    <Label
                                        htmlFor="submitted_by_position"
                                    >
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
                </SectionCard>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div>
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Total PPMP
                                Budget
                            </span>

                            <span className="ml-3 font-semibold tabular-nums text-primary">
                                {formatCurrency(
                                    totalBudget,
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
                            ? 'Saving Changes...'
                            : 'Save Changes'}
                    </Button>
                </ActionBar>
            </form>
        </AppLayout>
    );
}
