import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo } from 'react';

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
        pre_procurement_conference: false,
        procurement_start_month: '',
        procurement_end_month: '',
        expected_delivery_month: '',
        source_of_funds: '',
        estimated_budget: '',
        remarks: '',
    };
}

type ItemField = Exclude<keyof PpmpItemForm, 'id'>;

const inputClass =
    'w-full rounded-md border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(value);
}

function sanitizeBudgetInput(value: string): string {
    const withoutCommas = value.replace(/,/g, '');

    const cleaned = withoutCommas.replace(/[^\d.]/g, '');

    const parts = cleaned.split('.');

    const whole = parts[0] ?? '';
    const decimal = parts.slice(1).join('').slice(0, 2);

    if (cleaned.includes('.')) {
        return `${whole}.${decimal}`;
    }

    return whole;
}

function formatBudgetInput(value: string): string {
    if (!value) {
        return '';
    }

    const [wholePart, decimalPart] = value.split('.');

    const normalizedWhole =
        wholePart.replace(/^0+(?=\d)/, '') || '0';

    const formattedWhole = normalizedWhole.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ',',
    );

    if (decimalPart !== undefined) {
        return `${formattedWhole}.${decimalPart}`;
    }

    return formattedWhole;
}

function normalizeBudgetInput(value: string): string {
    if (!value) {
        return '';
    }

    const amount = Number(value.replace(/,/g, ''));

    if (!Number.isFinite(amount)) {
        return '';
    }

    return amount.toFixed(2);
}

export default function EditPpmp({ ppmp }: EditProps) {
    const office = ppmp.office;
    const coordinator = ppmp.coordinator;

    const currentFiscalYear = new Date().getFullYear();

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
    } = useForm<PpmpFormData>({
        fiscal_year: ppmp.fiscal_year,

        plan_type: ppmp.plan_type,

        prepared_by_name:
            ppmp.prepared_by_name ?? '',

        prepared_by_position:
            ppmp.prepared_by_position ?? '',

        submitted_by_name:
            ppmp.submitted_by_name ?? '',

        submitted_by_position:
            ppmp.submitted_by_position ?? '',

        items: ppmp.items.map(
            (item): PpmpItemForm => ({
                ...item,

                estimated_budget: String(
                    item.estimated_budget,
                ),
            }),
        ),
    });

    const totalBudget = useMemo(() => {
        return data.items.reduce(
            (total, item) => {
                const amount =
                    Number(
                        item.estimated_budget.replace(
                            /,/g,
                            '',
                        ),
                    ) || 0;

                return total + amount;
            },
            0,
        );
    }, [data.items]);

    function addItem() {
        setData('items', [
            ...data.items,
            createEmptyItem(),
        ]);
    }

    function removeItem(index: number) {
        if (data.items.length === 1) {
            return;
        }

        setData(
            'items',
            data.items.filter(
                (_, itemIndex) =>
                    itemIndex !== index,
            ),
        );
    }

    function updateItem<K extends ItemField>(
        index: number,
        field: K,
        value: PpmpItemForm[K],
    ) {
        const items = [...data.items];

        items[index] = {
            ...items[index],
            [field]: value,
        };

        setData('items', items);
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

    const submit: FormEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();

        put(`/ppmps/${ppmp.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${ppmp.ppmp_no}`} />

            <form
                onSubmit={submit}
                className="flex flex-1 flex-col gap-6 p-4"
            >
                {/* PAGE HEADER */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Edit PPMP
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Update the procurement items and
                            information for this PPMP.
                        </p>
                    </div>

                    <div className="text-left sm:text-right">
                        <div className="text-sm text-muted-foreground">
                            Total Budget
                        </div>

                        <div className="text-2xl font-bold">
                            {formatCurrency(totalBudget)}
                        </div>
                    </div>
                </div>

                {/* PPMP INFORMATION */}
                <section className="rounded-xl border bg-background p-5">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold">
                            PPMP Information
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            PPMP No.: {ppmp.ppmp_no}
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {/* Fiscal Year */}
                        <div className="grid gap-2">
                            <Label htmlFor="fiscal_year">
                                Fiscal Year
                            </Label>

                            <Input
                                id="fiscal_year"
                                type="number"
                                min="2020"
                                max={
                                    currentFiscalYear + 5
                                }
                                value={
                                    data.fiscal_year
                                }
                                onChange={(event) =>
                                    setData(
                                        'fiscal_year',
                                        Number(
                                            event.target
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

                        {/* PPMP Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="plan_type">
                                PPMP Type
                            </Label>

                            <select
                                id="plan_type"
                                value={data.plan_type}
                                onChange={(event) =>
                                    setData(
                                        'plan_type',
                                        event.target.value,
                                    )
                                }
                                className="h-9 rounded-md border bg-background px-3 text-sm"
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

                        {/* Office */}
                        <div className="grid gap-2">
                            <Label>
                                End-User /
                                Implementing Unit
                            </Label>

                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                <div className="font-medium">
                                    {office.code}
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    {office.name}
                                </div>
                            </div>
                        </div>

                        {/* Coordinator */}
                        <div className="grid gap-2">
                            <Label>
                                PPMP Coordinator
                            </Label>

                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                <div className="font-medium">
                                    {coordinator.name}
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    {coordinator.position_title ??
                                        'No position title'}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PROCUREMENT ITEMS */}
                <section className="overflow-hidden rounded-xl border bg-background">
                    <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Procurement Project Details
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Update, add, or remove
                                procurement items included in
                                this PPMP.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={addItem}
                        >
                            + Add Item
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[2350px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="w-[280px] px-3 py-3 text-left">
                                        1. General Description
                                        and Objective
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-left">
                                        2. Project Type
                                    </th>

                                    <th className="w-[200px] px-3 py-3 text-left">
                                        3. Quantity and Size
                                    </th>

                                    <th className="w-[220px] px-3 py-3 text-left">
                                        4. Recommended Mode
                                    </th>

                                    <th className="w-[160px] px-3 py-3 text-left">
                                        5. Pre-Procurement
                                        Conference
                                    </th>

                                    <th className="w-[160px] px-3 py-3 text-left">
                                        6. Start
                                    </th>

                                    <th className="w-[160px] px-3 py-3 text-left">
                                        7. End
                                    </th>

                                    <th className="w-[170px] px-3 py-3 text-left">
                                        8. Expected Delivery
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-left">
                                        9. Source of Funds
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-right">
                                        10. Estimated Budget
                                    </th>

                                    <th className="w-[190px] px-3 py-3 text-left">
                                        11. Supporting
                                        Documents
                                    </th>

                                    <th className="w-[230px] px-3 py-3 text-left">
                                        12. Remarks
                                    </th>

                                    <th className="w-[90px] px-3 py-3 text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {data.items.map(
                                    (item, index) => (
                                        <tr
                                            key={
                                                item.id ??
                                                `new-${index}`
                                            }
                                            className="align-top"
                                        >
                                            {/* Description */}
                                            <td className="p-2">
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
                                                    rows={4}
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

                                            {/* Project Type */}
                                            <td className="p-2">
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

                                            {/* Quantity */}
                                            <td className="p-2">
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
                                                    rows={4}
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

                                            {/* Mode */}
                                            <td className="p-2">
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

                                            {/* Pre-procurement */}
                                            <td className="p-2">
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

                                            {/* Start */}
                                            <td className="p-2">
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

                                            {/* End */}
                                            <td className="p-2">
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

                                            {/* Delivery */}
                                            <td className="p-2">
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

                                            {/* Source of Funds */}
                                            <td className="p-2">
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

                                            {/* Estimated Budget */}
                                            <td className="p-2">
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="text-right"
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

                                                <InputError
                                                    message={errorFor(
                                                        `items.${index}.estimated_budget`,
                                                    )}
                                                />
                                            </td>

                                            {/* Supporting Documents */}
                                            <td className="p-2">
                                                {item.id ? (
                                                    <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                                        Supporting
                                                        documents for
                                                        this item can
                                                        now be managed
                                                        from the PPMP
                                                        details page.
                                                    </div>
                                                ) : (
                                                    <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                                        Save this new
                                                        item first
                                                        before
                                                        uploading
                                                        supporting
                                                        documents.
                                                    </div>
                                                )}
                                            </td>

                                            {/* Remarks */}
                                            <td className="p-2">
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
                                                    rows={4}
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

                                            {/* Remove */}
                                            <td className="p-2 text-center">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        data.items.length === 1
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
                                    ),
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
                                            totalBudget,
                                        )}
                                    </td>

                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                {/* SIGNATURE INFORMATION */}
                <section className="rounded-xl border bg-background p-5">
                    <h2 className="mb-5 text-lg font-semibold">
                        Prepared and Submitted By
                    </h2>

                    <div className="grid gap-5 md:grid-cols-2">
                        {/* Prepared By */}
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">
                                Prepared By
                            </h3>

                            <div className="grid gap-2">
                                <Label>Name</Label>

                                <Input
                                    value={
                                        data.prepared_by_name
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'prepared_by_name',
                                            event.target
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

                            <div className="grid gap-2">
                                <Label>
                                    Position /
                                    Designation
                                </Label>

                                <Input
                                    value={
                                        data.prepared_by_position
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'prepared_by_position',
                                            event.target
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

                        {/* Submitted By */}
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-medium">
                                Submitted By
                            </h3>

                            <div className="grid gap-2">
                                <Label>
                                    Division Chief / Head
                                </Label>

                                <Input
                                    value={
                                        data.submitted_by_name
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'submitted_by_name',
                                            event.target
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

                            <div className="grid gap-2">
                                <Label>
                                    Position /
                                    Designation
                                </Label>

                                <Input
                                    value={
                                        data.submitted_by_position
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'submitted_by_position',
                                            event.target
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
                </section>

                {/* BOTTOM ACTION BAR */}
                <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t bg-background/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                        <span className="text-muted-foreground">
                            Total PPMP Budget:{' '}
                        </span>

                        <span className="font-bold">
                            {formatCurrency(totalBudget)}
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
                            disabled={processing}
                        >
                            {processing
                                ? 'Saving Changes...'
                                : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
