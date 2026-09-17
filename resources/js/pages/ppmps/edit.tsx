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

type Attachment = {
    id: number;
    original_name: string;
    file_size: number | null;
};

type PpmpItemDetailForm = {
    id?: number;
    lineage_uuid?: string;
    source_detail_id?: number | null;

    project_type: string;
    quantity: string;
    unit: string;
    item_description: string;
    size_specification: string;
    estimated_amount: string;
};

type PpmpItemForm = {
    id?: number;

    description_objective: string;

    project_type?: string;
    quantity_size?: string;

    details: PpmpItemDetailForm[];

    recommended_mode_of_procurement: string;

    pre_procurement_conference: boolean;

    procurement_start_month: string;
    procurement_end_month: string;
    expected_delivery_month: string;

    source_of_funds: string;

    estimated_budget: string;

    /*
     * Existing Item No. 11 records already stored
     * in the database. These are display-only
     * metadata and are stripped before submission.
     */
    attachments: Attachment[];

    /*
     * New Item No. 11 files selected while editing.
     * Existing attachments are never removed merely
     * because this array is empty.
     */
    supporting_documents: File[];

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

type ItemField =
    Exclude<
        keyof PpmpItemForm,
        | 'id'
        | 'details'
        | 'project_type'
        | 'quantity_size'
        | 'attachments'
        | 'supporting_documents'
    >;

type ItemDetailField =
    keyof Omit<
        PpmpItemDetailForm,
        | 'id'
        | 'lineage_uuid'
        | 'source_detail_id'
    >;

type EditTab =
    | 'information'
    | 'items'
    | 'signatories';

function createEmptyDetail(): PpmpItemDetailForm {
    return {
        project_type: '',
        quantity: '',
        unit: '',
        item_description: '',
        size_specification: '',
        estimated_amount: '',
    };
}

function createEmptyItem(): PpmpItemForm {
    return {
        description_objective: '',

        details: [
            createEmptyDetail(),
        ],

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

        attachments: [],

        supporting_documents: [],

        remarks: '',
    };
}

function isDetailBlank(
    detail: PpmpItemDetailForm,
): boolean {
    return (
        !detail.project_type &&
        !detail.quantity &&
        !detail.unit &&
        !detail.item_description &&
        !detail.size_specification &&
        !detail.estimated_amount
    );
}

function cloneItemForm(
    item: PpmpItemForm,
): PpmpItemForm {
    return {
        ...item,

        details:
            item.details.map(
                (detail) => ({
                    ...detail,
                }),
            ),

        attachments: [
            ...item.attachments,
        ],

        supporting_documents: [
            ...item.supporting_documents,
        ],
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

    if (
        cleaned.includes('.')
    ) {
        return `${whole}.${decimal}`;
    }

    return whole;
}

function normalizeQuantityInput(
    value: string,
): string {
    if (!value) {
        return '';
    }

    const amount =
        Number(value);

    if (
        !Number.isFinite(
            amount,
        ) ||
        amount <= 0
    ) {
        return '';
    }

    return String(
        Number(
            amount.toFixed(3),
        ),
    );
}

function projectTypeSummary(
    item: PpmpItemForm,
): string {
    const types =
        Array.from(
            new Set(
                item.details
                    .map(
                        (detail) =>
                            detail.project_type.trim(),
                    )
                    .filter(Boolean),
            ),
        );

    return types.length > 0
        ? types.join(', ')
        : '—';
}

function detailPreview(
    detail: PpmpItemDetailForm,
): string {
    const main =
        [
            detail.quantity,
            detail.unit.trim(),
            detail.item_description.trim(),
        ]
            .filter(Boolean)
            .join(' ');

    const specification =
        detail.size_specification.trim();

    if (
        main &&
        specification
    ) {
        return `${main} — ${specification}`;
    }

    return (
        main ||
        specification ||
        '—'
    );
}

function formatFileSize(
    bytes: number | null,
): string {
    if (
        bytes === null ||
        bytes <= 0
    ) {
        return 'Size unavailable';
    }

    if (
        bytes < 1024
    ) {
        return `${bytes} B`;
    }

    if (
        bytes <
        1024 * 1024
    ) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
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
        post,
        transform,
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

                        details:
                            (
                                item.details ??
                                []
                            ).length > 0
                                ? (
                                      item.details ??
                                      []
                                  ).map(
                                      (
                                          detail,
                                      ) => ({
                                          ...detail,

                                          project_type:
                                              detail.project_type ??
                                              '',

                                          quantity:
                                              detail.quantity !==
                                                  null &&
                                              detail.quantity !==
                                                  undefined
                                                  ? String(
                                                        detail.quantity,
                                                    )
                                                  : '',

                                          unit:
                                              detail.unit ??
                                              '',

                                          item_description:
                                              detail.item_description ??
                                              '',

                                          size_specification:
                                              detail.size_specification ??
                                              '',

                                          estimated_amount:
                                              detail.estimated_amount !==
                                                  null &&
                                              detail.estimated_amount !==
                                                  undefined
                                                  ? String(
                                                        detail.estimated_amount,
                                                    )
                                                  : '',
                                      }),
                                  )
                                : [
                                      {
                                          ...createEmptyDetail(),

                                          project_type:
                                              item.project_type ??
                                              '',

                                          item_description:
                                              item.description_objective ??
                                              '',

                                          size_specification:
                                              item.quantity_size ??
                                              '',
                                      },
                                  ],

                        estimated_budget:
                            item.estimated_budget !==
                                null &&
                            item.estimated_budget !==
                                undefined
                                ? String(
                                      item.estimated_budget,
                                  )
                                : '',

                        attachments:
                            item.attachments ??
                            [],

                        /*
                         * This contains only NEW files selected
                         * during this edit session.
                         */
                        supporting_documents:
                            [],

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

    const editorMeaningfulDetails =
        useMemo(
            () =>
                editorItem.details.filter(
                    (detail) =>
                        !isDetailBlank(
                            detail,
                        ),
                ),
            [editorItem.details],
        );

    const editorDetailsWithAmount =
        useMemo(
            () =>
                editorMeaningfulDetails.filter(
                    (detail) =>
                        detail.estimated_amount
                            .trim() !== '',
                ),
            [editorMeaningfulDetails],
        );

    const hasAnyDetailAmount =
        editorDetailsWithAmount.length >
        0;

    const hasCompleteDetailAmounts =
        editorMeaningfulDetails.length >
            0 &&
        editorDetailsWithAmount.length ===
            editorMeaningfulDetails.length;

    const hasPartialDetailAmounts =
        hasAnyDetailAmount &&
        !hasCompleteDetailAmounts;

    const detailEstimatedAmountTotal =
        useMemo(() => {
            const totalCents =
                editorDetailsWithAmount.reduce(
                    (
                        total,
                        detail,
                    ) => {
                        const amount =
                            Number(
                                detail.estimated_amount.replace(
                                    /,/g,
                                    '',
                                ),
                            ) ||
                            0;

                        return (
                            total +
                            Math.round(
                                amount *
                                    100,
                            )
                        );
                    },
                    0,
                );

            return (
                totalCents /
                100
            );
        }, [
            editorDetailsWithAmount,
        ]);

    const calculatedItemTenBudget =
        useMemo(() => {
            if (
                hasCompleteDetailAmounts
            ) {
                return detailEstimatedAmountTotal;
            }

            if (
                !hasAnyDetailAmount
            ) {
                return (
                    Number(
                        editorItem.estimated_budget.replace(
                            /,/g,
                            '',
                        ),
                    ) ||
                    0
                );
            }

            return 0;
        }, [
            hasCompleteDetailAmounts,
            hasAnyDetailAmount,
            detailEstimatedAmountTotal,
            editorItem.estimated_budget,
        ]);

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

    const hasItemErrors =
        Object.keys(
            errors,
        ).some((key) =>
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

        setEditorItem(
            cloneItemForm(
                item,
            ),
        );

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

    function updateEditorDetail<
        K extends ItemDetailField,
    >(
        detailIndex: number,
        field: K,
        value: PpmpItemDetailForm[K],
    ) {
        setEditorItem(
            (current) => ({
                ...current,

                details:
                    current.details.map(
                        (
                            detail,
                            index,
                        ) =>
                            index ===
                            detailIndex
                                ? {
                                      ...detail,

                                      [field]:
                                          value,
                                  }
                                : detail,
                    ),
            }),
        );

        setEditorError(
            null,
        );
    }

    function addEditorDetail() {
        setEditorItem(
            (current) => ({
                ...current,

                details: [
                    ...current.details,
                    createEmptyDetail(),
                ],
            }),
        );

        setEditorError(
            null,
        );
    }

    function removeEditorDetail(
        detailIndex: number,
    ) {
        setEditorItem(
            (current) => {
                if (
                    current.details.length ===
                    1
                ) {
                    return {
                        ...current,

                        details: [
                            createEmptyDetail(),
                        ],
                    };
                }

                return {
                    ...current,

                    details:
                        current.details.filter(
                            (
                                _,
                                index,
                            ) =>
                                index !==
                                detailIndex,
                        ),
                };
            },
        );

        setEditorError(
            null,
        );
    }

    function addSupportingDocuments(
        files: FileList | null,
    ) {
        if (!files) {
            return;
        }

        const selected =
            Array.from(
                files,
            );

        const allowedExtensions = [
            'pdf',
            'doc',
            'docx',
            'xls',
            'xlsx',
            'jpg',
            'jpeg',
            'png',
        ];

        const maximumFileSize =
            20 * 1024 * 1024;

        for (
            const file
            of selected
        ) {
            const extension =
                file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase() ??
                '';

            if (
                !allowedExtensions.includes(
                    extension,
                )
            ) {
                setEditorError(
                    `"${file.name}" is not a supported file type. Use PDF, Word, Excel, JPG, or PNG.`,
                );

                return;
            }

            if (
                file.size >
                maximumFileSize
            ) {
                setEditorError(
                    `"${file.name}" exceeds the 20 MB file size limit.`,
                );

                return;
            }
        }

        setEditorItem(
            (current) => {
                const combined = [
                    ...current.supporting_documents,
                    ...selected,
                ];

                /*
                 * Prevent the same local file from being
                 * selected more than once.
                 */
                const unique =
                    combined.filter(
                        (
                            file,
                            index,
                            all,
                        ) =>
                            all.findIndex(
                                (
                                    candidate,
                                ) =>
                                    candidate.name ===
                                        file.name &&
                                    candidate.size ===
                                        file.size &&
                                    candidate.lastModified ===
                                        file.lastModified,
                            ) === index,
                    );

                if (
                    unique.length >
                    20
                ) {
                    setEditorError(
                        'A procurement item may contain a maximum of 20 new supporting documents per save.',
                    );

                    return current;
                }

                return {
                    ...current,

                    supporting_documents:
                        unique,
                };
            },
        );

        setEditorError(
            null,
        );
    }

    function removeSupportingDocument(
        fileIndex: number,
    ) {
        setEditorItem(
            (current) => ({
                ...current,

                supporting_documents:
                    current.supporting_documents.filter(
                        (
                            _,
                            index,
                        ) =>
                            index !==
                            fileIndex,
                    ),
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

        setEditorItem(
            cloneItemForm(
                item,
            ),
        );

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

        const meaningfulDetails =
            editorItem.details.filter(
                (detail) =>
                    !isDetailBlank(
                        detail,
                    ),
            );

        if (
            meaningfulDetails.length ===
            0
        ) {
            setEditorError(
                'Please add at least one Project Type with its corresponding Quantity and Size details.',
            );

            return;
        }

        for (
            let detailIndex = 0;
            detailIndex <
            meaningfulDetails.length;
            detailIndex += 1
        ) {
            const detail =
                meaningfulDetails[
                    detailIndex
                ];

            if (
                !detail.project_type
            ) {
                setEditorError(
                    `Please select the Project Type for entry ${detailIndex + 1}.`,
                );

                return;
            }

            const normalizedQuantity =
                normalizeQuantityInput(
                    detail.quantity,
                );

            if (
                !normalizedQuantity
            ) {
                setEditorError(
                    `Please enter a valid quantity greater than zero for entry ${detailIndex + 1}.`,
                );

                return;
            }

            if (
                !detail.unit.trim()
            ) {
                setEditorError(
                    `Please enter the unit for entry ${detailIndex + 1}.`,
                );

                return;
            }

            if (
                !detail.item_description.trim()
            ) {
                setEditorError(
                    `Please enter the item / requirement description for entry ${detailIndex + 1}.`,
                );

                return;
            }
        }

        const amountEntries =
            meaningfulDetails.filter(
                (detail) =>
                    detail.estimated_amount
                        .trim() !== '',
            );

        if (
            amountEntries.length >
                0 &&
            amountEntries.length <
                meaningfulDetails.length
        ) {
            setEditorError(
                'Individual estimated amounts must be entered for all Project / Requirement entries or left blank for all entries.',
            );

            return;
        }

        const normalizedDetails =
            meaningfulDetails.map(
                (detail) => ({
                    ...detail,

                    project_type:
                        detail.project_type
                            .trim(),

                    quantity:
                        normalizeQuantityInput(
                            detail.quantity,
                        ),

                    unit:
                        detail.unit.trim(),

                    item_description:
                        detail.item_description
                            .trim(),

                    size_specification:
                        detail.size_specification
                            .trim(),

                    estimated_amount:
                        detail.estimated_amount
                            ? normalizeBudgetInput(
                                  detail.estimated_amount,
                              )
                            : '',
                }),
            );

        let resolvedEstimatedBudget =
            '';

        if (
            amountEntries.length ===
            meaningfulDetails.length
        ) {
            const totalCents =
                normalizedDetails.reduce(
                    (
                        total,
                        detail,
                    ) => {
                        const amount =
                            Number(
                                detail.estimated_amount,
                            ) ||
                            0;

                        return (
                            total +
                            Math.round(
                                amount *
                                    100,
                            )
                        );
                    },
                    0,
                );

            resolvedEstimatedBudget =
                (
                    totalCents /
                    100
                ).toFixed(2);
        } else {
            resolvedEstimatedBudget =
                editorItem.estimated_budget
                    ? normalizeBudgetInput(
                          editorItem.estimated_budget,
                      )
                    : '';
        }

        const normalizedItem:
            PpmpItemForm = {
            ...editorItem,

            details:
                normalizedDetails,

            estimated_budget:
                resolvedEstimatedBudget,
        };

        if (
            editingIndex !==
            null
        ) {
            const items = [
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

            /*
             * Laravel/PHP handles multipart file uploads most
             * reliably through POST. Use method spoofing so the
             * existing resource update route still receives PUT.
             *
             * Existing attachment metadata is display-only and
             * must not be submitted back to the server.
             */
            transform(
                (
                    formData,
                ) => ({
                    ...formData,

                    _method:
                        'put',

                    items:
                        formData.items.map(
                            (
                                item,
                            ) => {
                                /*
                                 * Existing attachment metadata is
                                 * display-only. Copy the item first,
                                 * then remove that property without
                                 * creating an unused local variable.
                                 */
                                const submittedItem:
                                    Partial<PpmpItemForm> = {
                                        ...item,
                                    };

                                delete submittedItem.attachments;

                                return submittedItem;
                            },
                        ),
                }),
            );

            post(
                `/ppmps/${ppmp.id}`,
                {
                    preserveScroll:
                        true,

                    forceFormData:
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
                    description={`Update procurement information and project details for ${ppmp.ppmp_no}.`}
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
                        <div className="grid border-b border-border bg-secondary/25 sm:grid-cols-2 xl:grid-cols-5">
                            {/* REFERENCE */}
                            <div className="border-b border-border px-4 py-3 sm:border-r xl:border-b-0">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP No.
                                </div>

                                <div className="mt-1 font-bold text-blue-700 dark:text-blue-300">
                                    {
                                        ppmp.ppmp_no
                                    }
                                </div>
                            </div>

                            {/* OFFICE */}
                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    End-User
                                    Unit
                                </div>

                                <div className="mt-1 text-sm font-bold text-primary">
                                    {
                                        office.code
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
                                        data.fiscal_year
                                    }
                                </div>
                            </div>

                            {/* TYPE */}
                            <div className="border-b border-border px-4 py-3 xl:border-b-0 xl:border-r">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    PPMP Type
                                </div>

                                <div className="mt-1 text-sm font-bold capitalize">
                                    {
                                        data.plan_type
                                    }
                                </div>
                            </div>

                            {/* ITEM COUNT */}
                            <div className="px-4 py-3 sm:col-span-2 xl:col-span-1">
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Items
                                </div>

                                <div className="mt-1 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {
                                        data.items
                                            .length
                                    }
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
                                                Update
                                                the fiscal
                                                year and
                                                PPMP type.
                                                Office and
                                                coordinator
                                                are
                                                controlled
                                                by the
                                                system.
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
                                                        required
                                                    />

                                                    <InputError
                                                        message={
                                                            errors.fiscal_year
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* TYPE */}
                                            <div className="border-b border-border p-5">
                                                <div className="pms-field">
                                                    <Label htmlFor="plan_type">
                                                        PPMP
                                                        Type
                                                    </Label>

                                                    <div
                                                        id="plan_type"
                                                        className="flex h-9 w-full items-center border border-input bg-secondary/20 px-3 text-sm font-semibold capitalize"
                                                    >
                                                        {
                                                            data.plan_type
                                                        }
                                                    </div>

                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        PPMP type is system-controlled. Coordinators cannot change an Indicative PPMP to Final.
                                                    </p>
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
                                                    Review
                                                    the fiscal
                                                    year,
                                                    classification,
                                                    office,
                                                    and
                                                    coordinator.
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
                                                    Existing documents are retained, and additional Item No. 11 supporting documents may be added while editing. Stored documents can still be removed from the PPMP Details page.
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
                                            One or
                                            more
                                            procurement
                                            items
                                            contain
                                            validation
                                            errors.
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
                                                <table className="pms-table min-w-[1420px]">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[55px]">
                                                                #
                                                            </th>

                                                            <th className="w-[320px]">
                                                                Procurement
                                                                Item
                                                            </th>

                                                            <th className="w-[180px]">
                                                                Project
                                                                Type
                                                            </th>

                                                            <th className="w-[320px]">
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
                                                                        <div className="text-xs font-semibold leading-5">
                                                                            {projectTypeSummary(
                                                                                item,
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    <td>
                                                                        <div className="space-y-1.5">
                                                                            {item.details
                                                                                .filter(
                                                                                    (
                                                                                        detail,
                                                                                    ) =>
                                                                                        !isDetailBlank(
                                                                                            detail,
                                                                                        ),
                                                                                )
                                                                                .slice(
                                                                                    0,
                                                                                    3,
                                                                                )
                                                                                .map(
                                                                                    (
                                                                                        detail,
                                                                                        detailIndex,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                detail.id ??
                                                                                                detailIndex
                                                                                            }
                                                                                            className="text-xs leading-5"
                                                                                        >
                                                                                            {detailPreview(
                                                                                                detail,
                                                                                            )}
                                                                                        </div>
                                                                                    ),
                                                                                )}

                                                                            {item.details.filter(
                                                                                (
                                                                                    detail,
                                                                                ) =>
                                                                                    !isDetailBlank(
                                                                                        detail,
                                                                                    ),
                                                                            )
                                                                                .length >
                                                                                3 && (
                                                                                <div className="text-[10px] font-semibold text-muted-foreground">
                                                                                    +
                                                                                    {item.details.filter(
                                                                                        (
                                                                                            detail,
                                                                                        ) =>
                                                                                            !isDetailBlank(
                                                                                                detail,
                                                                                            ),
                                                                                    )
                                                                                        .length -
                                                                                        3}{' '}
                                                                                    more
                                                                                </div>
                                                                            )}
                                                                        </div>
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
                            <div className="flex size-10 items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400">
                                <CircleDollarSign className="size-5" />
                            </div>

                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    Total
                                    PPMP Budget
                                </div>

                                <div className="mt-0.5 text-lg font-bold tabular-nums text-primary">
                                    {formatCurrency(
                                        totalBudget,
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
                            ? 'Saving Changes...'
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
                                        Procurement
                                        Item
                                    </div>

                                    <h2 className="mt-1 text-lg font-bold">
                                        {editingIndex !==
                                        null
                                            ? 'Edit Procurement Item'
                                            : 'Add Procurement Item'}
                                    </h2>

                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        Update
                                        project
                                        details,
                                        procurement
                                        schedule,
                                        funding,
                                        and
                                        estimated
                                        budget.
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

                            {/* EDITOR BODY */}
                            <div className="flex-1 overflow-y-auto">
                                {editorError && (
                                    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                        {
                                            editorError
                                        }
                                    </div>
                                )}

                                <div className="space-y-6 p-5 md:p-6">
                                    {/* GENERAL */}
                                    <section>
                                        <div className="mb-4 border-l-[3px] border-blue-500 pl-3">
                                            <div className="text-sm font-bold">
                                                General
                                                Information
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Description,
                                                project
                                                classification,
                                                and
                                                quantity.
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="pms-field">
                                                <Label htmlFor="edit_item_description">
                                                    General
                                                    Description
                                                    and
                                                    Objective
                                                </Label>

                                                <textarea
                                                    id="edit_item_description"
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
                                                    rows={
                                                        4
                                                    }
                                                    placeholder="Describe the procurement requirement and its objective..."
                                                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
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
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <Label className="text-sm font-semibold">
                                                            Item No. 2 · Type of the Project to be Procured
                                                        </Label>

                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            Each Project Type entry is linked to its own Item No. 3 Quantity and Size information.
                                                        </p>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={
                                                            addEditorDetail
                                                        }
                                                        className="shrink-0"
                                                    >
                                                        <Plus className="size-3.5" />
                                                        Add Another Project Type
                                                    </Button>
                                                </div>

                                                <div className="mt-4 space-y-4">
                                                    {editorItem.details.map(
                                                        (
                                                            detail,
                                                            detailIndex,
                                                        ) => (
                                                            <div
                                                                key={
                                                                    detail.id ??
                                                                    `detail-${detailIndex}`
                                                                }
                                                                className="border border-border bg-secondary/10"
                                                            >
                                                                <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/25 px-4 py-3">
                                                                    <div>
                                                                        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                                            Linked Item 2 + Item 3
                                                                        </div>

                                                                        <div className="mt-0.5 text-sm font-bold">
                                                                            Project / Requirement{' '}
                                                                            {detailIndex +
                                                                                1}
                                                                        </div>
                                                                    </div>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            removeEditorDetail(
                                                                                detailIndex,
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                                                                    >
                                                                        <Trash2 className="size-3.5" />

                                                                        {editorItem
                                                                            .details
                                                                            .length >
                                                                        1
                                                                            ? 'Remove'
                                                                            : 'Clear'}
                                                                    </Button>
                                                                </div>

                                                                <div className="space-y-4 p-4">
                                                                    <div className="pms-field">
                                                                        <Label
                                                                            htmlFor={`edit_project_type_${detailIndex}`}
                                                                        >
                                                                            Project Type
                                                                        </Label>

                                                                        <select
                                                                            id={`edit_project_type_${detailIndex}`}
                                                                            value={
                                                                                detail.project_type
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateEditorDetail(
                                                                                    detailIndex,
                                                                                    'project_type',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-9 w-full border border-input bg-background px-3 text-sm"
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
                                                                                    `items.${editingIndex}.details.${detailIndex}.project_type`,
                                                                                )}
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {detail.project_type && (
                                                                        <div className="border-t border-border pt-4">
                                                                            <div className="mb-4 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                                                Item No. 3 · Quantity and Size of the Project to be Procured
                                                                            </div>

                                                                            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                                                                                <div className="pms-field">
                                                                                    <Label htmlFor={`edit_quantity_${detailIndex}`}>
                                                                                        Quantity
                                                                                    </Label>

                                                                                    <Input
                                                                                        id={`edit_quantity_${detailIndex}`}
                                                                                        type="text"
                                                                                        inputMode="decimal"
                                                                                        value={
                                                                                            detail.quantity
                                                                                        }
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) =>
                                                                                            updateEditorDetail(
                                                                                                detailIndex,
                                                                                                'quantity',
                                                                                                sanitizeQuantityInput(
                                                                                                    event.target.value,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                        onBlur={() =>
                                                                                            updateEditorDetail(
                                                                                                detailIndex,
                                                                                                'quantity',
                                                                                                normalizeQuantityInput(
                                                                                                    detail.quantity,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                        placeholder="100"
                                                                                    />
                                                                                </div>

                                                                                <div className="pms-field">
                                                                                    <Label htmlFor={`edit_unit_${detailIndex}`}>
                                                                                        Unit
                                                                                    </Label>

                                                                                    <Input
                                                                                        id={`edit_unit_${detailIndex}`}
                                                                                        value={
                                                                                            detail.unit
                                                                                        }
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) =>
                                                                                            updateEditorDetail(
                                                                                                detailIndex,
                                                                                                'unit',
                                                                                                event.target.value,
                                                                                            )
                                                                                        }
                                                                                        placeholder="packs, btls., pcs., units, lots..."
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-4 pms-field">
                                                                                <Label htmlFor={`edit_detail_description_${detailIndex}`}>
                                                                                    Item / Requirement
                                                                                </Label>

                                                                                <Input
                                                                                    id={`edit_detail_description_${detailIndex}`}
                                                                                    value={
                                                                                        detail.item_description
                                                                                    }
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateEditorDetail(
                                                                                            detailIndex,
                                                                                            'item_description',
                                                                                            event.target.value,
                                                                                        )
                                                                                    }
                                                                                    placeholder="e.g. Detergent powder"
                                                                                />
                                                                            </div>

                                                                            <div className="mt-4 pms-field">
                                                                                <Label htmlFor={`edit_size_specification_${detailIndex}`}>
                                                                                    Size / Specification
                                                                                </Label>

                                                                                <textarea
                                                                                    id={`edit_size_specification_${detailIndex}`}
                                                                                    value={
                                                                                        detail.size_specification
                                                                                    }
                                                                                    onChange={(
                                                                                        event,
                                                                                    ) =>
                                                                                        updateEditorDetail(
                                                                                            detailIndex,
                                                                                            'size_specification',
                                                                                            event.target.value,
                                                                                        )
                                                                                    }
                                                                                    rows={3}
                                                                                    placeholder="Optional size, dimensions, capacity, technical specification, or other requirement..."
                                                                                    className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
                                                                                />
                                                                            </div>

                                                                            <div className="mt-4 pms-field">
                                                                                <Label htmlFor={`edit_estimated_amount_${detailIndex}`}>
                                                                                    Estimated Amount
                                                                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                                                        (Optional)
                                                                                    </span>
                                                                                </Label>

                                                                                <div className="relative mt-2">
                                                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                                                                        ₱
                                                                                    </span>

                                                                                    <Input
                                                                                        id={`edit_estimated_amount_${detailIndex}`}
                                                                                        type="text"
                                                                                        inputMode="decimal"
                                                                                        className="pl-8 text-right font-semibold tabular-nums"
                                                                                        value={formatBudgetInput(
                                                                                            detail.estimated_amount,
                                                                                        )}
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) =>
                                                                                            updateEditorDetail(
                                                                                                detailIndex,
                                                                                                'estimated_amount',
                                                                                                sanitizeBudgetInput(
                                                                                                    event.target.value,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                        onBlur={() =>
                                                                                            updateEditorDetail(
                                                                                                detailIndex,
                                                                                                'estimated_amount',
                                                                                                detail.estimated_amount
                                                                                                    ? normalizeBudgetInput(
                                                                                                          detail.estimated_amount,
                                                                                                      )
                                                                                                    : '',
                                                                                            )
                                                                                        }
                                                                                        placeholder="0.00"
                                                                                    />
                                                                                </div>

                                                                                {editingIndex !==
                                                                                    null && (
                                                                                    <InputError
                                                                                        message={errorFor(
                                                                                            `items.${editingIndex}.details.${detailIndex}.estimated_amount`,
                                                                                        )}
                                                                                    />
                                                                                )}
                                                                            </div>

                                                                            <div className="mt-4 border-l-[3px] border-emerald-500 bg-emerald-50/40 px-3 py-2.5 dark:bg-emerald-950/10">
                                                                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                                                                                    Quantity / Size Preview
                                                                                </div>

                                                                                <div className="mt-1 text-sm font-semibold">
                                                                                    {detailPreview(
                                                                                        detail,
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* METHOD */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-emerald-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Procurement
                                                Method
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Recommended
                                                mode and
                                                pre-procurement
                                                conference.
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="pms-field">
                                                <Label>
                                                    Recommended
                                                    Mode of
                                                    Procurement
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
                                                <Label>
                                                    Pre-Procurement
                                                    Conference
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
                                                Procurement
                                                Schedule
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Procurement
                                                start,
                                                completion,
                                                and
                                                expected
                                                delivery.
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="pms-field">
                                                <Label>
                                                    Start
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
                                                />
                                            </div>

                                            <div className="pms-field">
                                                <Label>
                                                    End
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
                                                />
                                            </div>

                                            <div className="pms-field">
                                                <Label>
                                                    Expected
                                                    Delivery
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
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* FUNDING */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-violet-500 pl-3">
                                            <div className="text-sm font-bold">
                                                Funding
                                                and
                                                Budget
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Funding source and the system-resolved Item No. 10 budget.
                                            </div>
                                        </div>

                                        <div className="pms-field">
                                            <Label>
                                                Item No. 9 · Source of Funds
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
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Source of funds"
                                            />
                                        </div>

                                        {!hasAnyDetailAmount && (
                                            <div className="mt-5 pms-field">
                                                <Label>
                                                    Estimated Budget
                                                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                        (Optional Fallback)
                                                    </span>
                                                </Label>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Use this only when individual estimated amounts are not available for the Project / Requirement entries.
                                                </p>

                                                <div className="relative mt-2">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                                                        ₱
                                                    </span>

                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="pl-8 text-right font-semibold tabular-nums"
                                                        value={formatBudgetInput(
                                                            editorItem.estimated_budget,
                                                        )}
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateEditorItem(
                                                                'estimated_budget',
                                                                sanitizeBudgetInput(
                                                                    event.target.value,
                                                                ),
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            updateEditorItem(
                                                                'estimated_budget',
                                                                editorItem.estimated_budget
                                                                    ? normalizeBudgetInput(
                                                                          editorItem.estimated_budget,
                                                                      )
                                                                    : '',
                                                            )
                                                        }
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    You may leave this blank while the PPMP remains a Draft.
                                                </p>
                                            </div>
                                        )}

                                        {hasPartialDetailAmounts && (
                                            <div className="mt-5 border-l-[3px] border-amber-500 bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/20">
                                                <div className="font-bold text-amber-800 dark:text-amber-300">
                                                    Individual costing is incomplete
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                                                    Since at least one Project / Requirement entry has an estimated amount, all remaining entries must also have an estimated amount.
                                                </p>
                                            </div>
                                        )}

                                        <div className="mt-5 pms-field">
                                            <Label>
                                                Item No. 10 · Estimated Budget / Authorized Budgetary Allocation (PhP)
                                            </Label>

                                            <div className="mt-2 border border-violet-200 bg-violet-50/40 px-4 py-4 dark:border-violet-900 dark:bg-violet-950/15">
                                                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">
                                                    System Calculated · Read-Only
                                                </div>

                                                {hasPartialDetailAmounts ? (
                                                    <div className="mt-2">
                                                        <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                                                            Incomplete Individual Costing
                                                        </div>

                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Complete all individual estimated amounts before Item No. 10 can be finalized.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="mt-2 text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
                                                            {formatCurrency(
                                                                calculatedItemTenBudget,
                                                            )}
                                                        </div>

                                                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            {hasCompleteDetailAmounts
                                                                ? `Calculated automatically from ${editorMeaningfulDetails.length} Project / Requirement ${
                                                                      editorMeaningfulDetails.length === 1
                                                                          ? 'entry'
                                                                          : 'entries'
                                                                  }.`
                                                                : editorItem.estimated_budget
                                                                  ? 'Based on the optional fallback estimated budget.'
                                                                  : 'No estimated budget has been provided yet.'}
                                                        </div>
                                                    </>
                                                )}

                                                {editingIndex !==
                                                    null && (
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.estimated_budget`,
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* ITEM NO. 11 - SUPPORTING DOCUMENTS */}
                                    <section className="border-t border-border pt-6">
                                        <div className="mb-4 border-l-[3px] border-sky-500 pl-3">
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-sky-600 text-sm font-bold text-white">
                                                    11
                                                </span>

                                                Supporting Documents
                                            </div>

                                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                                Optional. Existing documents are retained. You may add more supporting documents while editing this procurement item.
                                            </p>
                                        </div>

                                        {editorItem.attachments.length >
                                            0 && (
                                            <div className="mb-4 border border-border">
                                                <div className="border-b border-border bg-secondary/30 px-3 py-2">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                                                        Existing Documents ·{' '}
                                                        {
                                                            editorItem
                                                                .attachments
                                                                .length
                                                        }
                                                    </div>
                                                </div>

                                                <div className="divide-y divide-border">
                                                    {editorItem.attachments.map(
                                                        (
                                                            attachment,
                                                        ) => (
                                                            <div
                                                                key={
                                                                    attachment.id
                                                                }
                                                                className="flex items-center justify-between gap-4 px-3 py-3"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <FileText className="size-4 shrink-0 text-sky-600" />

                                                                        <span className="truncate text-sm font-semibold">
                                                                            {
                                                                                attachment.original_name
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    <div className="mt-1 pl-6 text-[10px] text-muted-foreground">
                                                                        {formatFileSize(
                                                                            attachment.file_size,
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
                                                                    Retained
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>

                                                <div className="border-t border-border bg-secondary/15 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
                                                    Existing documents are not deleted when you save this form. Use the PPMP Details page if a stored document must be removed.
                                                </div>
                                            </div>
                                        )}

                                        <div className="pms-field">
                                            <Label
                                                htmlFor="edit_supporting_documents"
                                                className="text-sm font-semibold"
                                            >
                                                Add New Documents
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    (Optional)
                                                </span>
                                            </Label>

                                            <div className="mt-2 border border-dashed border-border bg-secondary/10 p-4">
                                                <input
                                                    id="edit_supporting_documents"
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                    onChange={(
                                                        event,
                                                    ) => {
                                                        addSupportingDocuments(
                                                            event
                                                                .target
                                                                .files,
                                                        );

                                                        /*
                                                         * Clear the native input so the
                                                         * same file can be selected again
                                                         * after it has been removed.
                                                         */
                                                        event.target.value =
                                                            '';
                                                    }}
                                                    className="block w-full text-xs file:mr-3 file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-xs file:font-semibold"
                                                />

                                                <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                                    PDF, Word, Excel, JPG or PNG. Maximum 20 MB per file and maximum 20 new documents per save.
                                                </div>
                                            </div>

                                            {editorItem
                                                .supporting_documents
                                                .length >
                                                0 && (
                                                <div className="mt-4 border border-border">
                                                    <div className="border-b border-border bg-sky-50/50 px-3 py-2 dark:bg-sky-950/10">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-sky-700 dark:text-sky-300">
                                                            New Documents To Add ·{' '}
                                                            {
                                                                editorItem
                                                                    .supporting_documents
                                                                    .length
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="divide-y divide-border">
                                                        {editorItem.supporting_documents.map(
                                                            (
                                                                file,
                                                                fileIndex,
                                                            ) => (
                                                                <div
                                                                    key={`${file.name}-${file.size}-${file.lastModified}`}
                                                                    className="flex items-center justify-between gap-4 px-3 py-3"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <FileText className="size-4 shrink-0 text-sky-600" />

                                                                            <span className="truncate text-sm font-semibold">
                                                                                {
                                                                                    file.name
                                                                                }
                                                                            </span>
                                                                        </div>

                                                                        <div className="mt-1 pl-6 text-[10px] text-muted-foreground">
                                                                            {formatFileSize(
                                                                                file.size,
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            removeSupportingDocument(
                                                                                fileIndex,
                                                                            )
                                                                        }
                                                                        className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                                                                    >
                                                                        <X className="size-3.5" />
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {editingIndex !==
                                                null && (
                                                <>
                                                    <InputError
                                                        message={errorFor(
                                                            `items.${editingIndex}.supporting_documents`,
                                                        )}
                                                    />

                                                    {editorItem.supporting_documents.map(
                                                        (
                                                            _,
                                                            fileIndex,
                                                        ) => (
                                                            <InputError
                                                                key={
                                                                    fileIndex
                                                                }
                                                                message={errorFor(
                                                                    `items.${editingIndex}.supporting_documents.${fileIndex}`,
                                                                )}
                                                            />
                                                        ),
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </section>

                                    {/* REMARKS */}
                                    <section className="border-t border-border pt-6">
                                        <div className="pms-field">
                                            <Label className="flex items-center gap-2 text-base font-semibold">
                                                <span className="inline-flex h-7 w-7 items-center justify-center bg-slate-700 text-sm font-bold text-white">
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
                                                rows={
                                                    4
                                                }
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
