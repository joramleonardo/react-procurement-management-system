import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { PageHeader } from '@/components/pms/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    Info,
    Pencil,
    Plus,
    RotateCcw,
    Save,
    Send,
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

const COMMON_UNITS: readonly string[] = [
    'piece',
    'unit',
    'lot',
    'set',
    'box',
    'pack',
    'bottle',
    'ream',
    'roll',
    'pad',
    'can',
    'tube',
    'pouch',
    'bundle',
    'pair',
    'meter',
    'kilogram',
    'liter',
    'carton',
    'package',
    'license',
    'copy',
    'pax',
    'month',
    'year',
];

type Office = {
    id: number;
    code: string;
    name: string;
};

type PpmpSourceDetail = {
    id: number;
    project_type: string | null;
    quantity: string | null;
    unit: string | null;
    item_description: string | null;
    size_specification: string | null;
    estimated_amount: string | null;
    sort_order: number;
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
    details: PpmpSourceDetail[];
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

type PrItemForm = {
    id?: number;
    ppmp_item_id: string;
    ppmp_item_detail_id: string;
    stock_property_no: string;
    unit: string;
    item_description: string;
    quantity: string;
    unit_cost: string;
    sort_order?: number;
};

type PurchaseRequestRecord = {
    id: number;
    pr_no: string;
    entity_name: string;
    fund_cluster: string;
    responsibility_center_code: string;
    pr_date: string;
    purpose: string;
    requested_by_name: string;
    requested_by_designation: string;
    approved_by_name: string;
    approved_by_designation: string;
    status: string;
    remarks: string | null;
    items: PrItemForm[];
};

type EditProps = {
    purchaseRequest: PurchaseRequestRecord;
    ppmp: Ppmp;
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
    action?: 'draft' | 'submit';
};

type PrItemField = keyof PrItemForm;

type EditTab = 'information' | 'items' | 'signatories';

function createEmptyItem(): PrItemForm {
    return {
        ppmp_item_id: '',
        ppmp_item_detail_id: '',
        stock_property_no: '',
        unit: '',
        item_description: '',
        quantity: '',
        unit_cost: '',
    };
}

function isItemBlank(item: PrItemForm): boolean {
    return (
        !item.ppmp_item_id &&
        !item.ppmp_item_detail_id &&
        !item.stock_property_no &&
        !item.unit &&
        !item.item_description &&
        !item.quantity &&
        !item.unit_cost
    );
}

function parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
        return 0;
    }
    const amount = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number | string): string {
    const numeric = typeof value === 'string' ? parseNumber(value) : value;
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatQuantity(value: string | number | null | undefined): string {
    const numeric = parseNumber(value);
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(numeric);
}

function normalizeMoneyInput(value: string): string {
    const raw = value.replace(/,/g, '').trim();
    if (!raw) return '';
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0) return '';
    return numeric.toFixed(2);
}

function detailDescription(detail: PpmpSourceDetail): string {
    const desc = detail.item_description?.trim() ?? '';
    const spec = detail.size_specification?.trim() ?? '';
    if (desc && spec) return `${desc} — ${spec}`;
    return desc || spec;
}

function suggestedUnitCost(detail: PpmpSourceDetail): string {
    const amount = parseNumber(detail.estimated_amount);
    const quantity = parseNumber(detail.quantity);
    if (amount > 0 && quantity > 0) {
        return (amount / quantity).toFixed(2);
    }
    if (amount > 0) {
        return amount.toFixed(2);
    }
    return '';
}

export default function EditPurchaseRequest({
    purchaseRequest,
    ppmp,
}: EditProps) {
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
        {
            title: 'Edit',
            href: `/purchase-requests/${purchaseRequest.id}/edit`,
        },
    ];

    const fundSources = Array.from(
        new Set(
            ppmp.items
                .map((item) => item.source_of_funds?.trim())
                .filter((val): val is string => Boolean(val)),
        ),
    );

    const {
        data,
        setData,
        put,
        processing,
        errors,
        setError,
        clearErrors,
        transform,
    } = useForm<PurchaseRequestFormData>({
        entity_name: purchaseRequest.entity_name || 'DOST-STII',
        fund_cluster: purchaseRequest.fund_cluster || (ppmp.items.find((item) => Boolean(item.source_of_funds?.trim()))?.source_of_funds?.trim() ?? ''),
        responsibility_center_code: purchaseRequest.responsibility_center_code ?? '',
        pr_date: purchaseRequest.pr_date ?? '',
        purpose: purchaseRequest.purpose ?? '',
        requested_by_name: purchaseRequest.requested_by_name ?? '',
        requested_by_designation: purchaseRequest.requested_by_designation ?? '',
        approved_by_name: purchaseRequest.approved_by_name ?? '',
        approved_by_designation: purchaseRequest.approved_by_designation ?? '',
        items: purchaseRequest.items.length > 0 ? purchaseRequest.items : [createEmptyItem()],
    });

    const [activeTab, setActiveTab] = useState<EditTab>('items');
    const [itemEditorOpen, setItemEditorOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editorItem, setEditorItem] = useState<PrItemForm>(createEmptyItem());
    const [editorError, setEditorError] = useState<string | null>(null);
    const [customUnitMode, setCustomUnitMode] = useState(false);

    const unitOptions = useMemo(() => {
        const trimmed = editorItem.unit?.trim();
        if (
            trimmed &&
            !COMMON_UNITS.some(
                (u) => u.toLowerCase() === trimmed.toLowerCase()
            )
        ) {
            return [trimmed, ...COMMON_UNITS];
        }
        return [...COMMON_UNITS];
    }, [editorItem.unit]);

    const lineTotals = useMemo(
        () =>
            data.items.map(
                (item) => parseNumber(item.quantity) * parseNumber(item.unit_cost)
            ),
        [data.items]
    );

    const totalAmount = useMemo(
        () => lineTotals.reduce((total, amount) => total + amount, 0),
        [lineTotals]
    );

    const overallRemaining = Math.max(
        0,
        parseNumber(ppmp.total_budget) - parseNumber(ppmp.approved_pr_total)
    );

    const draftUsageBySource = useMemo(() => {
        const usage: Record<string, number> = {};
        data.items.forEach((item, index) => {
            if (!item.ppmp_item_id) return;
            usage[item.ppmp_item_id] =
                (usage[item.ppmp_item_id] ?? 0) + (lineTotals[index] ?? 0);
        });
        return usage;
    }, [data.items, lineTotals]);

    const meaningfulItems = useMemo(
        () =>
            data.items
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => !isItemBlank(item)),
        [data.items]
    );

    function sourceFor(ppmpItemId: string): PpmpSourceItem | undefined {
        return ppmp.items.find((item) => String(item.id) === ppmpItemId);
    }

    function detailFor(
        ppmpItemId: string,
        detailId: string
    ): PpmpSourceDetail | undefined {
        const source = sourceFor(ppmpItemId);
        return source?.details.find((d) => String(d.id) === detailId);
    }

    useEffect(() => {
        const keys = Object.keys(errors);
        const itemError = keys.find((k) => /^items\.\d+\./.test(k));

        if (itemError) {
            setActiveTab('items');
            const match = itemError.match(/^items\.(\d+)\./);
            if (match) {
                const index = Number(match[1]);
                const item = data.items[index];
                if (item) {
                    setEditingIndex(index);
                    setEditorItem({ ...item });
                    setItemEditorOpen(true);
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

        if (keys.some((k) => signatoryFields.includes(k))) {
            setActiveTab('signatories');
            return;
        }

        if (keys.length > 0) {
            setActiveTab('information');
        }
    }, [errors, data.items]);

    function updateEditorItem<K extends PrItemField>(
        field: K,
        value: PrItemForm[K]
    ) {
        setEditorItem((current) => ({
            ...current,
            [field]: value,
        }));
        setEditorError(null);
    }

    function selectEditorPpmpDetail(detailId: string) {
        const selected = ppmp.items
            .flatMap((sourceItem) =>
                sourceItem.details.map((detail) => ({
                    sourceItem,
                    detail,
                }))
            )
            .find(({ detail }) => String(detail.id) === detailId);

        if (!selected) {
            setEditorItem((current) => ({
                ...current,
                ppmp_item_id: '',
                ppmp_item_detail_id: '',
                unit: '',
                item_description: '',
                quantity: '',
                unit_cost: '',
            }));
            setEditorError(null);
            return;
        }

        const { sourceItem, detail } = selected;

        setEditorItem((current) => ({
            ...current,
            ppmp_item_id: String(sourceItem.id),
            ppmp_item_detail_id: String(detail.id),
            unit: detail.unit ?? '',
            item_description:
                detailDescription(detail) || sourceItem.description_objective,
            quantity: detail.quantity ?? '',
            unit_cost: suggestedUnitCost(detail),
        }));
        setCustomUnitMode(false);
        setEditorError(null);
    }

    function openNewItem() {
        setEditingIndex(null);
        setEditorItem(createEmptyItem());
        setCustomUnitMode(false);
        setEditorError(null);
        setItemEditorOpen(true);
    }

    function openEditItem(index: number) {
        const item = data.items[index];
        if (!item) return;

        setEditingIndex(index);
        setEditorItem({ ...item });
        setCustomUnitMode(false);
        setEditorError(null);
        setItemEditorOpen(true);
    }

    function closeItemEditor() {
        setItemEditorOpen(false);
        setEditingIndex(null);
        setEditorItem(createEmptyItem());
        setCustomUnitMode(false);
        setEditorError(null);
    }

    function saveEditorItem() {
        if (!editorItem.ppmp_item_id || !editorItem.ppmp_item_detail_id) {
            setEditorError('Please select a PPMP Item / Requirement.');
            return;
        }

        if (!editorItem.item_description.trim()) {
            setEditorError('Please provide an item description.');
            return;
        }

        const qty = parseNumber(editorItem.quantity);
        if (qty <= 0) {
            setEditorError('Quantity must be greater than zero.');
            return;
        }

        if (!editorItem.unit_cost) {
            setEditorError('Please enter the unit cost.');
            return;
        }

        const normalized: PrItemForm = {
            ...editorItem,
            unit_cost: normalizeMoneyInput(editorItem.unit_cost),
        };

        if (editingIndex !== null) {
            const items = [...data.items];
            items[editingIndex] = normalized;
            setData('items', items);
        } else if (data.items.length === 1 && isItemBlank(data.items[0])) {
            setData('items', [normalized]);
        } else {
            setData('items', [...data.items, normalized]);
        }

        closeItemEditor();
    }

    function removeItem(index: number) {
        const confirmed = window.confirm('Remove this item from the Purchase Request?');
        if (!confirmed) return;

        if (data.items.length === 1) {
            setData('items', [createEmptyItem()]);
            return;
        }

        const remaining = data.items.filter((_, itemIndex) => itemIndex !== index);
        setData('items', remaining.length > 0 ? remaining : [createEmptyItem()]);
    }

    const editorLineTotal =
        parseNumber(editorItem.quantity) * parseNumber(editorItem.unit_cost);
    const editorSource = sourceFor(editorItem.ppmp_item_id);

    let editorProjectedUsage = editorItem.ppmp_item_id
        ? draftUsageBySource[editorItem.ppmp_item_id] ?? 0
        : 0;

    if (editingIndex !== null) {
        const originalItem = data.items[editingIndex];
        if (originalItem && originalItem.ppmp_item_id === editorItem.ppmp_item_id) {
            editorProjectedUsage -= lineTotals[editingIndex] ?? 0;
        }
    }
    editorProjectedUsage += editorLineTotal;

    const editorRemaining = editorSource
        ? parseNumber(editorSource.remaining_balance)
        : 0;
    const editorOverBudget =
        editorSource !== undefined && editorProjectedUsage > editorRemaining;

    const editorDetail = detailFor(
        editorItem.ppmp_item_id,
        editorItem.ppmp_item_detail_id
    );

    const editorParentBudget = editorSource
        ? parseNumber(editorSource.estimated_budget)
        : 0;

    const editorApprovedUsed = editorSource
        ? parseNumber(editorSource.approved_pr_amount)
        : 0;

    const editorNetRemaining = editorRemaining - editorProjectedUsage;

    const editorPercentApproved =
        editorParentBudget > 0
            ? (editorApprovedUsed / editorParentBudget) * 100
            : 0;

    const editorPercentDraft =
        editorParentBudget > 0
            ? (editorProjectedUsage / editorParentBudget) * 100
            : 0;

    const editorPercentTotal =
        editorPercentApproved + editorPercentDraft;

    const editorPlannedQty = editorDetail?.quantity
        ? parseNumber(editorDetail.quantity)
        : null;

    const editorCurrentQty = parseNumber(editorItem.quantity);

    const editorQtyExceeded =
        editorPlannedQty !== null &&
        editorPlannedQty > 0 &&
        editorCurrentQty > editorPlannedQty;

    const editorQtyUnder =
        editorPlannedQty !== null &&
        editorPlannedQty > 0 &&
        editorCurrentQty > 0 &&
        editorCurrentQty < editorPlannedQty;

    const handleSave = (targetAction: 'draft' | 'submit') => {
        clearErrors();
        if (targetAction === 'submit') {
            if (!data.purpose.trim()) {
                setActiveTab('signatories');
                setError('purpose', 'Purpose of Purchase Request is required before submitting.');
                return;
            }

            if (!data.requested_by_name.trim()) {
                setActiveTab('signatories');
                setError('requested_by_name', 'Requested By name is required before submitting.');
                return;
            }

            if (!data.requested_by_designation.trim()) {
                setActiveTab('signatories');
                setError('requested_by_designation', 'Requested By designation is required before submitting.');
                return;
            }

            const validItems = data.items.filter((item) => !isItemBlank(item));
            if (validItems.length === 0) {
                setActiveTab('items');
                setError('items', 'At least one item is required before submitting.');
                return;
            }

            const actionLabel = purchaseRequest.status === 'returned_for_revision'
                ? 'Resubmit the revised Purchase Request for GSPS review?'
                : 'Submit this Purchase Request for GSPS review? It will be locked while under review.';

            const confirmed = window.confirm(actionLabel);
            if (!confirmed) return;
        }

        transform((formData) => ({
            ...formData,
            action: targetAction,
        }));

        put(`/purchase-requests/${purchaseRequest.id}`, {
            preserveScroll: true,
        });
    };

    const submit: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        handleSave('draft');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${purchaseRequest.pr_no}`} />

            <form onSubmit={submit} className="pms-page bg-background">
                <PageHeader
                    eyebrow="Purchase Request"
                    title={`Edit ${purchaseRequest.pr_no}`}
                    description={`Update GAM Appendix 60 Purchase Request draft or returned submission for ${ppmp.ppmp_no}.`}
                    icon={FileText}
                    actions={
                        <div className="flex flex-wrap items-center justify-end gap-3">
                            <div className="text-right">
                                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Current PR Total
                                </div>
                                <div className="text-2xl font-bold tabular-nums text-primary">
                                    {formatCurrency(totalAmount)}
                                </div>
                            </div>

                            <Button variant="outline" asChild>
                                <Link href={`/purchase-requests/${purchaseRequest.id}`}>
                                    <ArrowLeft className="size-4" />
                                    Cancel
                                </Link>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => handleSave('draft')}
                            >
                                <Save className="size-4" />
                                {processing ? 'Saving...' : 'Save PR Changes'}
                            </Button>

                            <Button
                                type="button"
                                disabled={processing}
                                onClick={() => handleSave('submit')}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {purchaseRequest.status === 'returned_for_revision' ? (
                                    <>
                                        <RotateCcw className="size-4" />
                                        {processing ? 'Resubmitting...' : 'Resubmit for Review'}
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4" />
                                        {processing ? 'Submitting...' : 'Submit for Review'}
                                    </>
                                )}
                            </Button>
                        </div>
                    }
                />

                {purchaseRequest.status === 'returned_for_revision' && purchaseRequest.remarks && (
                    <div className="border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                    Returned for Revision Remarks
                                </h3>
                                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                                    {purchaseRequest.remarks}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* SUMMARY STATS */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="border border-border bg-card p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Office
                        </div>
                        <div className="mt-1 text-base font-bold text-foreground">
                            {ppmp.office.code}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                            {ppmp.office.name}
                        </div>
                    </div>

                    <div className="border border-border bg-card p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Source PPMP
                        </div>
                        <div className="mt-1 text-base font-bold text-foreground">
                            {ppmp.ppmp_no}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Fiscal Year {ppmp.fiscal_year}
                        </div>
                    </div>

                    <div className="border border-border bg-card p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Items in PR
                        </div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                            {meaningfulItems.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {data.items.length} line{data.items.length !== 1 ? 's' : ''} configured
                        </div>
                    </div>

                    <div className="border border-border bg-card p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Remaining Budget
                        </div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(overallRemaining)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            PPMP total unutilized
                        </div>
                    </div>
                </section>

                {/* TABS HEADER */}
                <section className="border border-border bg-card">
                    <div className="flex overflow-x-auto border-b border-border">
                        <button
                            type="button"
                            onClick={() => setActiveTab('information')}
                            className={`flex min-h-12 items-center gap-2 border-r border-border px-5 text-sm font-semibold transition ${
                                activeTab === 'information'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                            }`}
                        >
                            <Info className="size-4" />
                            1. Header & General Information
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('items')}
                            className={`flex min-h-12 items-center gap-2 border-r border-border px-5 text-sm font-semibold transition ${
                                activeTab === 'items'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                            }`}
                        >
                            <ClipboardList className="size-4" />
                            2. Purchase Request Items ({meaningfulItems.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('signatories')}
                            className={`flex min-h-12 items-center gap-2 border-r border-border px-5 text-sm font-semibold transition ${
                                activeTab === 'signatories'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                            }`}
                        >
                            <UsersRound className="size-4" />
                            3. Purpose & Signatories
                        </button>
                    </div>

                    {/* TAB 1: INFORMATION */}
                    {activeTab === 'information' && (
                        <div className="p-6 space-y-6">
                            <div className="border-b border-border pb-4">
                                <h2 className="text-base font-bold">
                                    GAM Appendix 60 Header Information
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Official agency identification fields printed on the Purchase Request header.
                                </p>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="entity_name">
                                        Entity Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="entity_name"
                                        value={data.entity_name}
                                        onChange={(e) => setData('entity_name', e.target.value)}
                                        className="mt-1.5"
                                        placeholder="e.g. DOST-STII"
                                    />
                                    <InputError message={errors.entity_name} className="mt-1" />
                                </div>

                                <div>
                                    <Label htmlFor="pr_date">PR Date</Label>
                                    <Input
                                        id="pr_date"
                                        type="date"
                                        value={data.pr_date}
                                        onChange={(e) => setData('pr_date', e.target.value)}
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.pr_date} className="mt-1" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="fund_cluster">Fund Cluster</Label>
                                        {fundSources.length > 0 && (
                                            <span className="text-[11px] text-muted-foreground">
                                                From Source of Funds
                                            </span>
                                        )}
                                    </div>
                                    <Input
                                        id="fund_cluster"
                                        list="edit-ppmp-fund-options"
                                        value={data.fund_cluster}
                                        onChange={(e) => setData('fund_cluster', e.target.value)}
                                        className="mt-1.5"
                                        placeholder="e.g. 01 - Regular Agency Fund"
                                    />
                                    {fundSources.length > 0 && (
                                        <datalist id="edit-ppmp-fund-options">
                                            {fundSources.map((fund) => (
                                                <option key={fund} value={fund} />
                                            ))}
                                        </datalist>
                                    )}
                                    <InputError message={errors.fund_cluster} className="mt-1" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="responsibility_center_code">
                                            Responsibility Center Code
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground">
                                            (Optional)
                                        </span>
                                    </div>
                                    <Input
                                        id="responsibility_center_code"
                                        value={data.responsibility_center_code}
                                        onChange={(e) => setData('responsibility_center_code', e.target.value)}
                                        className="mt-1.5"
                                        placeholder="Optional (e.g. 19-001-00-00000)"
                                    />
                                    <InputError message={errors.responsibility_center_code} className="mt-1" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    onClick={() => setActiveTab('items')}
                                >
                                    Proceed to Items
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ITEMS */}
                    {activeTab === 'items' && (
                        <div className="p-6 space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                                <div>
                                    <h2 className="text-base font-bold">
                                        Itemized Procurement Items
                                    </h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Line items linked to exact parent PPMP items and child requirements.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={openNewItem}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <Plus className="size-4" />
                                    Add Line Item
                                </Button>
                            </div>

                            {errors.items && (
                                <p className="text-xs font-semibold text-red-600">
                                    {errors.items}
                                </p>
                            )}

                            {meaningfulItems.length === 0 ? (
                                <div className="border border-dashed border-border bg-secondary/20 p-8 text-center">
                                    <ClipboardList className="mx-auto size-8 text-muted-foreground" />
                                    <h3 className="mt-2 text-sm font-semibold">No items added yet</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Click "Add Line Item" to select a requirement from approved {ppmp.ppmp_no}.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={openNewItem}
                                        className="mt-4"
                                    >
                                        <Plus className="size-4" />
                                        Add Line Item
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-border">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-border bg-secondary/50 font-bold uppercase tracking-wider text-muted-foreground">
                                            <tr>
                                                <th className="p-3">#</th>
                                                <th className="p-3">Requirement Link</th>
                                                <th className="p-3">Property No.</th>
                                                <th className="p-3">Description</th>
                                                <th className="p-3 text-right">Qty</th>
                                                <th className="p-3">Unit</th>
                                                <th className="p-3 text-right">Unit Cost</th>
                                                <th className="p-3 text-right">Total Cost</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-card">
                                            {data.items.map((item, index) => {
                                                if (isItemBlank(item)) return null;

                                                const parent = sourceFor(item.ppmp_item_id);
                                                const detail = detailFor(item.ppmp_item_id, item.ppmp_item_detail_id);
                                                const lineCost =
                                                    parseNumber(item.quantity) * parseNumber(item.unit_cost);
                                                const plannedQty = detail?.quantity
                                                    ? parseNumber(detail.quantity)
                                                    : null;
                                                const itemQty = parseNumber(item.quantity);
                                                const qtyExceeded =
                                                    plannedQty !== null &&
                                                    plannedQty > 0 &&
                                                    itemQty > plannedQty;

                                                return (
                                                    <tr key={index} className="hover:bg-secondary/20">
                                                        <td className="p-3 font-semibold text-muted-foreground">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3">
                                                            {parent && detail ? (
                                                                <div>
                                                                    <span className="font-bold text-primary">
                                                                        #{parent.sort_order}.{detail.sort_order}
                                                                    </span>
                                                                    <div className="max-w-[200px] truncate text-[11px] text-muted-foreground">
                                                                        {parent.description_objective}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-red-500">Unlinked</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-muted-foreground">
                                                            {item.stock_property_no || '—'}
                                                        </td>
                                                        <td className="p-3 max-w-[280px]">
                                                            <div className="font-medium text-foreground">
                                                                {item.item_description || '—'}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-semibold">
                                                            <div>{formatQuantity(item.quantity)}</div>
                                                            {qtyExceeded && (
                                                                <span
                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 font-sans"
                                                                    title={`Exceeds planned PPMP requirement quantity (${plannedQty} ${detail?.unit || ''})`}
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
                                                            {formatCurrency(lineCost)}
                                                        </td>
                                                        <td className="p-3 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openEditItem(index)}
                                                                >
                                                                    <Pencil className="size-3.5" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeItem(index)}
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </div>
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
                                                    {formatCurrency(totalAmount)}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setActiveTab('information')}
                                >
                                    <ChevronLeft className="size-4" />
                                    Back to Information
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => setActiveTab('signatories')}
                                >
                                    Proceed to Signatories
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SIGNATORIES */}
                    {activeTab === 'signatories' && (
                        <div className="p-6 space-y-6">
                            <div className="border-b border-border pb-4">
                                <h2 className="text-base font-bold">
                                    Purpose & Signatories
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Official justification and certifying officials appearing on the GAM Appendix 60 document.
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="purpose">
                                    Purpose <span className="text-red-500">*</span>
                                </Label>
                                <textarea
                                    id="purpose"
                                    rows={4}
                                    value={data.purpose}
                                    onChange={(e) => setData('purpose', e.target.value)}
                                    className="mt-1.5 block w-full rounded-none border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="State the objective, project, or necessity of this Purchase Request..."
                                />
                                <InputError message={errors.purpose} className="mt-1" />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2 pt-4">
                                <div className="space-y-4 border border-border p-4 bg-secondary/10">
                                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Requested By (Division Chief / Head)
                                    </div>

                                    <div>
                                        <Label htmlFor="requested_by_name">
                                            Printed Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="requested_by_name"
                                            value={data.requested_by_name}
                                            onChange={(e) => setData('requested_by_name', e.target.value)}
                                            className="mt-1.5"
                                            placeholder="Full Name"
                                        />
                                        <InputError message={errors.requested_by_name} className="mt-1" />
                                    </div>

                                    <div>
                                        <Label htmlFor="requested_by_designation">
                                            Designation / Position <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="requested_by_designation"
                                            value={data.requested_by_designation}
                                            onChange={(e) => setData('requested_by_designation', e.target.value)}
                                            className="mt-1.5"
                                            placeholder="e.g. Division Chief, CRPD"
                                        />
                                        <InputError message={errors.requested_by_designation} className="mt-1" />
                                    </div>
                                </div>

                                <div className="space-y-4 border border-border p-4 bg-secondary/10">
                                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Approved By (Agency Head / Director)
                                    </div>

                                    <div>
                                        <Label htmlFor="approved_by_name">Printed Name</Label>
                                        <Input
                                            id="approved_by_name"
                                            value={data.approved_by_name}
                                            onChange={(e) => setData('approved_by_name', e.target.value)}
                                            className="mt-1.5"
                                            placeholder="Director Name"
                                        />
                                        <InputError message={errors.approved_by_name} className="mt-1" />
                                    </div>

                                    <div>
                                        <Label htmlFor="approved_by_designation">Designation / Position</Label>
                                        <Input
                                            id="approved_by_designation"
                                            value={data.approved_by_designation}
                                            onChange={(e) => setData('approved_by_designation', e.target.value)}
                                            className="mt-1.5"
                                            placeholder="e.g. Director"
                                        />
                                        <InputError message={errors.approved_by_designation} className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setActiveTab('items')}
                                >
                                    <ChevronLeft className="size-4" />
                                    Back to Items
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Save className="size-4" />
                                    {processing ? 'Saving Changes...' : 'Save PR Changes'}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* BOTTOM ACTION BAR */}
                <ActionBar>
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground">
                                Total PR Amount:
                            </span>
                            <span className="text-lg font-bold tabular-nums text-primary">
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" asChild>
                                <Link href={`/purchase-requests/${purchaseRequest.id}`}>
                                    Cancel
                                </Link>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => handleSave('draft')}
                            >
                                <Save className="size-4" />
                                {processing ? 'Saving...' : 'Save PR Changes'}
                            </Button>

                            <Button
                                type="button"
                                disabled={processing}
                                onClick={() => handleSave('submit')}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {purchaseRequest.status === 'returned_for_revision' ? (
                                    <>
                                        <RotateCcw className="size-4" />
                                        {processing ? 'Resubmitting...' : 'Resubmit for Review'}
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4" />
                                        {processing ? 'Submitting...' : 'Submit for Review'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </ActionBar>

                {/* ITEM EDITOR MODAL / DRAWER */}
                {itemEditorOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                        <div className="relative w-full max-w-2xl border border-border bg-card shadow-2xl">
                            {/* DRAWER HEADER */}
                            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        {editingIndex !== null ? 'Edit Line Item' : 'Add Line Item'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Select requirement from approved PPMP and configure quantity and cost.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeItemEditor}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            {/* DRAWER BODY */}
                            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
                                {editorError && (
                                    <div className="border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                                        {editorError}
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="ppmp_detail_select">
                                        Select PPMP Requirement <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="ppmp_detail_select"
                                        value={editorItem.ppmp_item_detail_id}
                                        onChange={(e) => selectEditorPpmpDetail(e.target.value)}
                                        className="mt-1.5 block w-full border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                                    >
                                        <option value="">— Select an Item / Requirement —</option>
                                        {ppmp.items.map((parent) => (
                                            <optgroup
                                                key={parent.id}
                                                label={`#${parent.sort_order}: ${parent.description_objective} (Bal: ${formatCurrency(parent.remaining_balance)})`}
                                            >
                                                {parent.details.map((detail) => (
                                                    <option
                                                        key={detail.id}
                                                        value={String(detail.id)}
                                                    >
                                                        #{parent.sort_order}.{detail.sort_order}: {detailDescription(detail)}
                                                        {detail.quantity ? ` (${detail.quantity} ${detail.unit || ''})` : ''}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {editorSource && (
                                    <div
                                        className={`border ${
                                            editorOverBudget
                                                ? 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
                                                : 'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20'
                                        }`}
                                    >
                                        <div className="p-3 text-xs">
                                            <div className="flex flex-wrap items-center justify-between gap-1">
                                                <div className="font-semibold text-blue-900 dark:text-blue-200">
                                                    Parent Item #{editorSource.sort_order}: {editorSource.description_objective}
                                                </div>
                                                {editorSource.source_of_funds && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Fund: <strong className="text-foreground">{editorSource.source_of_funds}</strong>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                <div className="border border-border/70 bg-background/60 p-2">
                                                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Allocated</div>
                                                    <div className="mt-0.5 text-xs font-bold tabular-nums">{formatCurrency(editorSource.estimated_budget)}</div>
                                                </div>
                                                <div className="border border-border/70 bg-background/60 p-2">
                                                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Approved Used</div>
                                                    <div className="mt-0.5 text-xs font-bold tabular-nums text-amber-600">{formatCurrency(editorSource.approved_pr_amount)}</div>
                                                </div>
                                                <div className="border border-border/70 bg-background/60 p-2">
                                                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Parent Remaining</div>
                                                    <div className="mt-0.5 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(editorSource.remaining_balance)}</div>
                                                </div>
                                                <div className="border border-border/70 bg-background/60 p-2">
                                                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">This PR Draft</div>
                                                    <div className={`mt-0.5 text-xs font-bold tabular-nums ${editorOverBudget ? 'text-red-600' : 'text-primary'}`}>{formatCurrency(editorProjectedUsage)}</div>
                                                </div>
                                            </div>

                                            {/* VISUAL CONSUMPTION BAR */}
                                            <div className="mt-3 border-t border-border/70 pt-2.5">
                                                <div className="mb-1 flex items-center justify-between text-[11px]">
                                                    <span className="font-medium text-muted-foreground">
                                                        Budget Utilization: <strong className={editorOverBudget ? 'text-red-600 font-bold' : 'text-foreground'}>{editorPercentTotal.toFixed(1)}%</strong>
                                                    </span>
                                                    {editorOverBudget ? (
                                                        <span className="font-bold text-red-600 dark:text-red-400">
                                                            Deficit: -{formatCurrency(Math.abs(editorNetRemaining))}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                                            Remaining after PR: <strong>{formatCurrency(Math.max(0, editorNetRemaining))}</strong>
                                                        </span>
                                                    )}
                                                </div>

                                                <div
                                                    className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
                                                    role="progressbar"
                                                    aria-valuenow={Math.min(100, Math.round(editorPercentTotal))}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                >
                                                    <div
                                                        className="absolute bottom-0 left-0 top-0 bg-amber-500 transition-all duration-300"
                                                        style={{ width: `${Math.min(100, editorPercentApproved)}%` }}
                                                        title={`Approved: ${formatCurrency(editorSource.approved_pr_amount)}`}
                                                    />
                                                    <div
                                                        className={`absolute bottom-0 top-0 transition-all duration-300 ${
                                                            editorOverBudget ? 'animate-pulse bg-red-600' : 'bg-emerald-600'
                                                        }`}
                                                        style={{
                                                            left: `${Math.min(100, editorPercentApproved)}%`,
                                                            width: `${Math.min(
                                                                Math.max(0, 100 - editorPercentApproved),
                                                                editorPercentDraft
                                                            )}%`,
                                                        }}
                                                        title={`This PR Draft: ${formatCurrency(editorProjectedUsage)}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {editorOverBudget && (
                                            <div className="flex items-start gap-1.5 border-t border-red-200 bg-red-100/60 p-2.5 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-600" />
                                                <span>
                                                    Projected usage exceeds remaining parent budget by <strong>{formatCurrency(Math.abs(editorNetRemaining))}</strong>.
                                                    Approval will be prevented until corrected.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="item_stock_property_no">Stock / Property No.</Label>
                                        <Input
                                            id="item_stock_property_no"
                                            value={editorItem.stock_property_no}
                                            onChange={(e) => updateEditorItem('stock_property_no', e.target.value)}
                                            className="mt-1.5"
                                            placeholder="Optional code"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="item_unit">Unit of Measure</Label>
                                            {!customUnitMode ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomUnitMode(true)}
                                                    className="text-[11px] font-medium text-primary hover:underline"
                                                >
                                                    Custom unit
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomUnitMode(false);
                                                        if (!COMMON_UNITS.includes(editorItem.unit)) {
                                                            updateEditorItem('unit', COMMON_UNITS[0]);
                                                        }
                                                    }}
                                                    className="text-[11px] font-medium text-primary hover:underline"
                                                >
                                                    Choose from list
                                                </button>
                                            )}
                                        </div>

                                        {customUnitMode ? (
                                            <Input
                                                id="item_unit"
                                                value={editorItem.unit}
                                                onChange={(e) => updateEditorItem('unit', e.target.value)}
                                                className="mt-1.5"
                                                placeholder="Enter custom unit (e.g. drum, cylinder)"
                                                autoFocus
                                            />
                                        ) : (
                                            <select
                                                id="item_unit"
                                                value={editorItem.unit}
                                                onChange={(e) => {
                                                    if (e.target.value === '__custom__') {
                                                        setCustomUnitMode(true);
                                                    } else {
                                                        updateEditorItem('unit', e.target.value);
                                                    }
                                                }}
                                                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                                            >
                                                <option value="">Select unit...</option>
                                                {unitOptions.map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                                <option value="__custom__">Other (Type custom unit)...</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="item_description">
                                        Item Description & Specifications <span className="text-red-500">*</span>
                                    </Label>
                                    <textarea
                                        id="item_description"
                                        rows={3}
                                        value={editorItem.item_description}
                                        onChange={(e) => updateEditorItem('item_description', e.target.value)}
                                        className="mt-1.5 block w-full border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                                        placeholder="Detailed description and specifications..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="item_quantity">
                                                Quantity <span className="text-red-500">*</span>
                                            </Label>
                                            {editorPlannedQty !== null && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    Planned: <strong className="font-semibold text-foreground">{editorPlannedQty} {editorDetail?.unit || ''}</strong>
                                                </span>
                                            )}
                                        </div>
                                        <Input
                                            id="item_quantity"
                                            value={editorItem.quantity}
                                            onChange={(e) => updateEditorItem('quantity', e.target.value)}
                                            className={`mt-1.5 font-mono ${
                                                editorQtyExceeded ? 'border-amber-500 focus-visible:ring-amber-500' : ''
                                            }`}
                                            placeholder="1"
                                        />

                                        {/* PPMP Physical Quantity Guard Notifications & Actions */}
                                        {editorPlannedQty !== null && (
                                            <div className="mt-1.5 space-y-1">
                                                {editorQtyExceeded && (
                                                    <div className="flex items-start justify-between gap-2 border border-amber-300 bg-amber-50/70 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                                        <div className="flex items-start gap-1.5">
                                                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                            <div>
                                                                <span>PR qty (<strong>{editorCurrentQty}</strong>) exceeds PPMP planned qty (<strong>{editorPlannedQty} {editorDetail?.unit || ''}</strong>).</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateEditorItem('quantity', String(editorPlannedQty))}
                                                            className="shrink-0 text-[11px] font-semibold text-amber-900 underline hover:text-amber-700 dark:text-amber-200"
                                                        >
                                                            Reset to {editorPlannedQty}
                                                        </button>
                                                    </div>
                                                )}

                                                {editorQtyUnder && (
                                                    <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] text-muted-foreground">
                                                        <span>Under PPMP planned by {editorPlannedQty - editorCurrentQty} {editorDetail?.unit || ''}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateEditorItem('quantity', String(editorPlannedQty))}
                                                            className="font-medium text-primary hover:underline"
                                                        >
                                                            Use full PPMP qty ({editorPlannedQty})
                                                        </button>
                                                    </div>
                                                )}

                                                {editorPlannedQty > 0 && editorCurrentQty === editorPlannedQty && (
                                                    <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                                        <CheckCircle2 className="size-3 text-emerald-600" />
                                                        <span>Matches PPMP planned allocation ({editorPlannedQty} {editorDetail?.unit || ''})</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="item_unit_cost">
                                            Unit Cost (₱) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="item_unit_cost"
                                            value={editorItem.unit_cost}
                                            onChange={(e) => updateEditorItem('unit_cost', e.target.value)}
                                            className="mt-1.5 font-mono"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center justify-between bg-secondary/30 p-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Computed Line Total:
                                        </span>
                                        <span className="text-xl font-bold font-mono text-primary">
                                            {formatCurrency(editorLineTotal)}
                                        </span>
                                    </div>

                                    {editorOverBudget && (
                                        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                            Warning: This line item brings projected usage ({formatCurrency(editorProjectedUsage)}) above the remaining item budget ({formatCurrency(editorRemaining)}).
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* DRAWER FOOTER */}
                            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeItemEditor}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    onClick={saveEditorItem}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {editingIndex !== null ? 'Update Item' : 'Add Item'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </AppLayout>
    );
}

