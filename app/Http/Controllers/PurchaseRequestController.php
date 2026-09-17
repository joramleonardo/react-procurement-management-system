<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest\StorePurchaseRequestRequest;
use App\Http\Requests\PurchaseRequest\UpdatePurchaseRequestRequest;
use App\Models\Ppmp;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseRequestController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService,
        private readonly PurchaseRequestWorkflowController $workflowController,
    ) {
    }

    /**
     * Display Purchase Requests available to the user.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless(
            $user->can('prs.view-own')
            || $user->can('prs.view-all'),
            403
        );

        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:255',
            ],

            'status' => [
                'nullable',

                Rule::in([
                    'draft',
                    'submitted',
                    'returned_for_revision',
                    'approved',
                ]),
            ],

            'year' => [
                'nullable',
                'integer',
                'min:2020',
                'max:'.(now()->year + 5),
            ],
        ]);

        $search = trim(
            (string) ($validated['search'] ?? '')
        );

        $status =
            (string) ($validated['status'] ?? '');

        $year =
            $validated['year'] ?? null;

        $query = PurchaseRequest::query()
            ->with([
                'ppmp:id,ppmp_no',
                'office:id,code,name',
                'requester:id,name',
            ])
            ->withCount('items');

        /*
         * GSPS/System Administrator:
         * See every PR.
         *
         * End User:
         * See PRs from their own division only.
         */
        if (! $user->can('prs.view-all')) {
            abort_if(
                $user->office_id === null,
                403,
                'Your account is not assigned to an office.'
            );

            $query->where(
                'office_id',
                $user->office_id
            );
        }

        $query
            ->when(
                $search !== '',
                function (
                    Builder $query
                ) use ($search): void {
                    $query->where(
                        function (
                            Builder $searchQuery
                        ) use ($search): void {
                            $searchQuery
                                ->where(
                                    'pr_no',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhere(
                                    'purpose',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhereHas(
                                    'ppmp',
                                    fn (
                                        Builder $ppmpQuery
                                    ) =>
                                        $ppmpQuery->where(
                                            'ppmp_no',
                                            'like',
                                            "%{$search}%"
                                        )
                                )
                                ->orWhereHas(
                                    'office',
                                    function (
                                        Builder $officeQuery
                                    ) use ($search): void {
                                        $officeQuery
                                            ->where(
                                                'code',
                                                'like',
                                                "%{$search}%"
                                            )
                                            ->orWhere(
                                                'name',
                                                'like',
                                                "%{$search}%"
                                            );
                                    }
                                );
                        }
                    );
                }
            )
            ->when(
                $status !== '',
                fn (Builder $query) =>
                    $query->where(
                        'status',
                        $status
                    )
            )
            ->when(
                $year !== null,
                fn (Builder $query) =>
                    $query->whereYear(
                        'pr_date',
                        $year
                    )
            );

        $purchaseRequests = $query
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString()
            ->through(
                fn (
                    PurchaseRequest $pr
                ) => [
                    'id' => $pr->id,

                    'pr_no' =>
                        $pr->pr_no,

                    'pr_date' =>
                        $pr->pr_date
                            ?->format(
                                'M d, Y'
                            ),

                    'status' =>
                        $pr->status,

                    'total_amount' =>
                        $pr->total_amount,

                    'purpose' =>
                        $pr->purpose,

                    'items_count' =>
                        $pr->items_count,

                    'ppmp' => [
                        'id' =>
                            $pr->ppmp->id,

                        'ppmp_no' =>
                            $pr->ppmp
                                ->ppmp_no,
                    ],

                    'office' => [
                        'id' =>
                            $pr->office->id,

                        'code' =>
                            $pr->office->code,

                        'name' =>
                            $pr->office->name,
                    ],

                    'requester' => [
                        'id' =>
                            $pr->requester->id,

                        'name' =>
                            $pr->requester->name,
                    ],

                    'can_edit' =>
                        in_array($pr->status, ['draft', 'returned_for_revision'], true)
                        && $user->can('prs.update-own')
                        && ($user->office_id === null || (int) $user->office_id === (int) $pr->office_id),

                    'can_submit' =>
                        $pr->status === 'draft'
                        && $user->can('prs.submit')
                        && ($user->office_id === null || (int) $user->office_id === (int) $pr->office_id),

                    'updated_at' =>
                        $pr->updated_at
                            ?->format(
                                'M d, Y h:i A'
                            ),
                ]
            );

        /*
         * Year filter options.
         */
        $yearsQuery =
            PurchaseRequest::query()
                ->whereNotNull(
                    'pr_date'
                );

        if (! $user->can('prs.view-all')) {
            $yearsQuery->where(
                'office_id',
                $user->office_id
            );
        }

        $years = $yearsQuery
            ->selectRaw(
                'YEAR(pr_date) as year'
            )
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(
                fn ($year) =>
                    (int) $year
            )
            ->values();

        return Inertia::render(
            'purchase-requests/index',
            [
                'purchaseRequests' =>
                    $purchaseRequests,

                'filters' => [
                    'search' =>
                        $search,

                    'status' =>
                        $status,

                    'year' =>
                        $year !== null
                            ? (string) $year
                            : '',
                ],

                'years' => $years,

                'can' => [
                    'create' =>
                        $user->can(
                            'prs.create'
                        ),
                ],

                'flash' => [
                    'success' =>
                        $request
                            ->session()
                            ->get(
                                'success'
                            ),
                ],
            ]
        );
    }

    /**
     * Display the Create PR form for an approved PPMP.
     */
    public function create(
        Request $request,
        Ppmp $ppmp
    ): Response {
        $this->ensureCanCreate(
            $request,
            $ppmp
        );

        $ppmp->load([
            'office:id,code,name',

            'coordinator:id,name,position_title',

            'items' => fn ($query) =>
                $query
                    ->with([
                        'details' => fn ($detailQuery) =>
                            $detailQuery->orderBy(
                                'sort_order'
                            ),
                    ])
                    ->orderBy(
                        'sort_order'
                    ),
        ]);

        /*
         * Approved PR utilization must follow the stable
         * PPMP item lineage across Indicative revisions.
         *
         * Never rely on ppmp_items.approved_pr_amount here:
         * that compatibility field is version-specific and
         * a newly cloned revision intentionally starts at 0.
         */
        $lineageUuids =
            $ppmp->items
                ->pluck(
                    'lineage_uuid'
                )
                ->filter(
                    fn ($uuid) =>
                        filled(
                            $uuid
                        )
                )
                ->map(
                    fn ($uuid) =>
                        (string) $uuid
                )
                ->unique()
                ->values()
                ->all();

        $approvedByLineage =
            $this
                ->approvedPrUtilizationByLineage(
                    $lineageUuids
                );

        /*
         * Overall PPMP utilization also needs to span every
         * version in the same PPMP series. This prevents a
         * later Indicative revision from appearing to regain
         * budget already consumed by an older approved PR.
         */
        $seriesApprovedPrTotalCents =
            $this
                ->approvedPrTotalForSeries(
                    $ppmp
                        ->ppmp_series_id,
                    $ppmp->id
                );

        $items = $ppmp->items
            ->map(
                function (
                    $item
                ) use (
                    $approvedByLineage
                ) {
                $budgetCents =
                    $this->moneyToCents(
                        $item->estimated_budget
                    );

                $lineageUuid =
                    trim(
                        (string) (
                            $item
                                ->lineage_uuid
                            ?? ''
                        )
                    );

                $approvedCents =
                    $lineageUuid !== ''
                        ? (
                            $approvedByLineage[
                                $lineageUuid
                            ]
                            ?? 0
                        )
                        : $this
                            ->moneyToCents(
                                $item
                                    ->approved_pr_amount
                            );

                $remainingCents =
                    max(
                        0,
                        $budgetCents
                        - $approvedCents
                    );

                return [
                    'id' =>
                        $item->id,

                    'sort_order' =>
                        $item->sort_order,

                    'description_objective' =>
                        $item
                            ->description_objective,

                    'project_type' =>
                        $item->project_type,

                    'quantity_size' =>
                        $item->quantity_size,

                    'source_of_funds' =>
                        $item->source_of_funds,

                    'estimated_budget' =>
                        number_format(
                            $budgetCents / 100,
                            2,
                            '.',
                            ''
                        ),

                    'approved_pr_amount' =>
                        number_format(
                            $approvedCents / 100,
                            2,
                            '.',
                            ''
                        ),

                    'remaining_balance' =>
                        number_format(
                            $remainingCents / 100,
                            2,
                            '.',
                            ''
                        ),

                    /*
                     * Exact Item No. 2 + Item No. 3
                     * children available for PR selection.
                     */
                    'details' =>
                        $item
                            ->details
                            ->map(
                                fn ($detail) => [
                                    'id' =>
                                        $detail->id,

                                    'project_type' =>
                                        $detail
                                            ->project_type,

                                    'quantity' =>
                                        $detail
                                            ->quantity,

                                    'unit' =>
                                        $detail
                                            ->unit,

                                    'item_description' =>
                                        $detail
                                            ->item_description,

                                    'size_specification' =>
                                        $detail
                                            ->size_specification,

                                    'estimated_amount' =>
                                        $detail
                                            ->estimated_amount,

                                    'sort_order' =>
                                        $detail
                                            ->sort_order,
                                ]
                            )
                            ->values(),
                ];
            })
            ->values();

        $defaultSourceOfFunds =
            $ppmp->items
                ->pluck('source_of_funds')
                ->filter(fn ($value) => filled($value))
                ->first() ?? '';

        return Inertia::render(
            'purchase-requests/create',
            [
                'ppmp' => [
                    'id' =>
                        $ppmp->id,

                    'ppmp_no' =>
                        $ppmp->ppmp_no,

                    'fiscal_year' =>
                        $ppmp->fiscal_year,

                    'total_budget' =>
                        $ppmp->total_budget,

                    'approved_pr_total' =>
                        number_format(
                            $seriesApprovedPrTotalCents
                                / 100,
                            2,
                            '.',
                            ''
                        ),

                    'office' => [
                        'id' =>
                            $ppmp->office->id,

                        'code' =>
                            $ppmp->office->code,

                        'name' =>
                            $ppmp->office->name,
                    ],

                    'items' => $items,
                ],

                'defaults' => [
                    'entity_name' =>
                        'DOST-STII',

                    'fund_cluster' =>
                        $defaultSourceOfFunds,

                    'pr_date' =>
                        now()->toDateString(),

                    /*
                     * The PPMP's Submitted By
                     * normally represents the
                     * Division Chief.
                     */
                    'requested_by_name' =>
                        $ppmp
                            ->submitted_by_name
                        ?? '',

                    'requested_by_designation' =>
                        $ppmp
                            ->submitted_by_position
                        ?? 'Division Chief',

                    'approved_by_name' =>
                        '',

                    'approved_by_designation' =>
                        'Director',
                ],
            ]
        );
    }

    /**
     * Save PR as Draft.
     */
    public function store(
        StorePurchaseRequestRequest $request,
        Ppmp $ppmp
    ): RedirectResponse {
        /*
         * Never rely only on the Create page guard.
         * A manipulated direct POST must pass the
         * same authorization and approved-PPMP rules.
         */
        $this->ensureCanCreate(
            $request,
            $ppmp
        );

        $validated =
            $request->validated();

        $user =
            $request->user();

        $isSubmitting =
            ($validated['action'] ?? 'draft') === 'submit';

        if ($isSubmitting) {
            abort_unless(
                $user->can('prs.submit'),
                403,
                'You do not have permission to submit Purchase Requests.'
            );
        }

        $ppmp->loadMissing([
            'items.details',
        ]);

        $ppmpItems =
            $ppmp->items
                ->keyBy('id');

        $purchaseRequest =
            DB::transaction(
                function () use (
                    $request,
                    $validated,
                    $user,
                    $ppmp,
                    $ppmpItems,
                    $isSubmitting
                ): PurchaseRequest {
                    $year =
                        filled(
                            $validated[
                                'pr_date'
                            ] ?? null
                        )
                            ? Carbon::parse(
                                $validated[
                                    'pr_date'
                                ]
                            )->year
                            : now()->year;

                    /*
                     * Temporary unique value until
                     * the PR receives its database ID.
                     */
                    $purchaseRequest =
                        PurchaseRequest::create([
                            'pr_no' =>
                                'TEMP-'.Str::uuid(),

                            'ppmp_id' =>
                                $ppmp->id,

                            /*
                             * Never accept the office
                             * from browser input.
                             */
                            'office_id' =>
                                $ppmp->office_id,

                            'requester_id' =>
                                $user->id,

                            'entity_name' =>
                                $validated[
                                    'entity_name'
                                ],

                            'fund_cluster' =>
                                $validated[
                                    'fund_cluster'
                                ] ?: ($ppmp->items->pluck('source_of_funds')->filter(fn ($value) => filled($value))->first() ?: null),

                            'responsibility_center_code' =>
                                $validated[
                                    'responsibility_center_code'
                                ] ?: null,

                            'pr_date' =>
                                $validated[
                                    'pr_date'
                                ] ?: null,

                            'purpose' =>
                                $validated[
                                    'purpose'
                                ] ?: null,

                            'requested_by_name' =>
                                $validated[
                                    'requested_by_name'
                                ] ?: null,

                            'requested_by_designation' =>
                                $validated[
                                    'requested_by_designation'
                                ] ?: null,

                            'approved_by_name' =>
                                $validated[
                                    'approved_by_name'
                                ] ?: null,

                            'approved_by_designation' =>
                                $validated[
                                    'approved_by_designation'
                                ] ?: null,

                            'status' =>
                                'draft',

                            'total_amount' =>
                                0,

                            'created_by' =>
                                $user->id,

                            'updated_by' =>
                                $user->id,
                        ]);

                    /*
                     * Example:
                     * PR-2026-0001
                     */
                    $purchaseRequest
                        ->forceFill([
                            'pr_no' =>
                                sprintf(
                                    'PR-%d-%04d',
                                    $year,
                                    $purchaseRequest
                                        ->id
                                ),
                        ])
                        ->save();

                    $totalRequestCents = 0;

                    foreach (
                        $validated['items']
                        as $index => $itemData
                    ) {
                        $sourceItem =
                            $ppmpItems->get(
                                (int)
                                    $itemData[
                                        'ppmp_item_id'
                                    ]
                            );

                        if (
                            $sourceItem === null
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.ppmp_item_id" =>
                                    'The selected PPMP item does not belong to this approved PPMP.',
                            ]);
                        }

                        /*
                         * Exact historical Item No. 2 + Item No. 3
                         * child. It must belong to the selected
                         * parent PPMP item.
                         */
                        $sourceDetail =
                            $sourceItem
                                ->details
                                ->firstWhere(
                                    'id',
                                    (int) (
                                        $itemData[
                                            'ppmp_item_detail_id'
                                        ]
                                        ?? 0
                                    )
                                );

                        if (
                            $sourceDetail === null
                        ) {
                            throw ValidationException::withMessages([
                                "items.{$index}.ppmp_item_detail_id" =>
                                    'The selected PPMP requirement does not belong to the selected PPMP item.',
                            ]);
                        }

                        $quantity =
                            filled(
                                $itemData[
                                    'quantity'
                                ] ?? null
                            )
                                ? (float)
                                    $itemData[
                                        'quantity'
                                    ]
                                : (
                                    filled(
                                        $sourceDetail
                                            ->quantity
                                    )
                                        ? (float)
                                            $sourceDetail
                                                ->quantity
                                        : 1
                                );

                        $unitCostCents =
                            $this
                                ->moneyToCents(
                                    $itemData[
                                        'unit_cost'
                                    ] ?? 0
                                );

                        /*
                         * Quantity may have decimals,
                         * so calculate and round the
                         * final cent amount.
                         */
                        $totalCostCents =
                            (int) round(
                                $quantity
                                * $unitCostCents
                            );

                        $totalRequestCents +=
                            $totalCostCents;

                        $description =
                            trim(
                                (string) (
                                    $itemData[
                                        'item_description'
                                    ] ?? ''
                                )
                            );

                        if ($description === '') {
                            $description =
                                trim(
                                    (string) (
                                        $sourceDetail
                                            ->item_description
                                        ?? ''
                                    )
                                );
                        }

                        if ($description === '') {
                            $description =
                                $sourceItem
                                    ->description_objective;
                        }

                        $unit =
                            trim(
                                (string) (
                                    $itemData[
                                        'unit'
                                    ]
                                    ?? ''
                                )
                            );

                        if ($unit === '') {
                            $unit =
                                trim(
                                    (string) (
                                        $sourceDetail
                                            ->unit
                                        ?? ''
                                    )
                                );
                        }

                        $purchaseRequest
                            ->items()
                            ->create([
                                'ppmp_item_id' =>
                                    $sourceItem->id,

                                'ppmp_item_detail_id' =>
                                    $sourceDetail->id,

                                'stock_property_no' =>
                                    $itemData[
                                        'stock_property_no'
                                    ] ?: null,

                                'unit' =>
                                    $unit !== ''
                                        ? $unit
                                        : null,

                                'item_description' =>
                                    $description,

                                'quantity' =>
                                    number_format(
                                        $quantity,
                                        3,
                                        '.',
                                        ''
                                    ),

                                'unit_cost' =>
                                    number_format(
                                        $unitCostCents
                                            / 100,
                                        2,
                                        '.',
                                        ''
                                    ),

                                'total_cost' =>
                                    number_format(
                                        $totalCostCents
                                            / 100,
                                        2,
                                        '.',
                                        ''
                                    ),

                                'sort_order' =>
                                    $index + 1,
                            ]);
                    }

                    $totalAmount =
                        number_format(
                            $totalRequestCents
                                / 100,
                            2,
                            '.',
                            ''
                        );

                    $purchaseRequest
                        ->forceFill([
                            'total_amount' =>
                                $totalAmount,
                        ])
                        ->save();

                    /*
                     * Business workflow history.
                     */
                    $purchaseRequest
                        ->statusHistories()
                        ->create([
                            'from_status' =>
                                null,

                            'to_status' =>
                                'draft',

                            'action' =>
                                'create',

                            'remarks' =>
                                'Purchase Request created and saved as draft.',

                            'action_by' =>
                                $user->id,

                            'acted_at' =>
                                now(),
                        ]);

                    /*
                     * System audit trail.
                     */
                    $this->auditLogService
                        ->record(
                            module:
                                'purchase-request',

                            action:
                                'pr-created',

                            subject:
                                $purchaseRequest,

                            description:
                                "Created {$purchaseRequest->pr_no} as draft.",

                            newValues: [
                                'pr_no' =>
                                    $purchaseRequest
                                        ->pr_no,

                                'ppmp_id' =>
                                    $ppmp->id,

                                'office_id' =>
                                    $ppmp
                                        ->office_id,

                                'status' =>
                                    'draft',

                                'total_amount' =>
                                    $totalAmount,
                            ],

                            request:
                                $request
                        );

                    if ($isSubmitting) {
                        $this->workflowController->validateReadyForSubmission($purchaseRequest);

                        $purchaseRequest->forceFill([
                            'status' => 'submitted',
                            'submitted_at' => now(),
                            'returned_at' => null,
                            'remarks' => null,
                        ])->save();

                        $purchaseRequest
                            ->statusHistories()
                            ->create([
                                'from_status' => 'draft',
                                'to_status' => 'submitted',
                                'action' => 'submit',
                                'remarks' => 'Purchase Request submitted for GSPS review upon creation.',
                                'action_by' => $user->id,
                                'acted_at' => now(),
                            ]);

                        $this->auditLogService
                            ->record(
                                module: 'purchase-request',
                                action: 'pr-submitted',
                                subject: $purchaseRequest,
                                description: "{$purchaseRequest->pr_no} was created and submitted for review.",
                                oldValues: [
                                    'status' => 'draft',
                                ],
                                newValues: [
                                    'status' => 'submitted',
                                ],
                                request: $request
                            );
                    }

                    return $purchaseRequest;
                }
            );

        $message = $isSubmitting
            ? "{$purchaseRequest->pr_no} was created and submitted for GSPS review."
            : "{$purchaseRequest->pr_no} was saved as draft.";

        return redirect()
            ->route(
                'purchase-requests.show',
                $purchaseRequest->id
            )
            ->with(
                'success',
                $message
            );
    }

    /**
     * Display the Edit PR form for a draft or returned PR.
     */
    public function edit(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): Response {
        $this->ensureCanEdit(
            $request,
            $purchaseRequest
        );

        $purchaseRequest->load([
            'ppmp' => function ($query): void {
                $query->with([
                    'office:id,code,name',
                    'coordinator:id,name,position_title',
                    'items' => fn ($itemQuery) =>
                        $itemQuery
                            ->with([
                                'details' => fn ($detailQuery) =>
                                    $detailQuery->orderBy('sort_order'),
                            ])
                            ->orderBy('sort_order'),
                ]);
            },
            'office:id,code,name',
            'items' => fn ($query) =>
                $query->orderBy('sort_order'),
        ]);

        $ppmp = $purchaseRequest->ppmp;

        $lineageUuids = $ppmp->items
            ->pluck('lineage_uuid')
            ->filter(fn ($uuid) => filled($uuid))
            ->map(fn ($uuid) => (string) $uuid)
            ->unique()
            ->values()
            ->all();

        $approvedByLineage = $this->approvedPrUtilizationByLineage($lineageUuids);

        $seriesApprovedPrTotalCents = $this->approvedPrTotalForSeries(
            $ppmp->ppmp_series_id,
            $ppmp->id
        );

        $ppmpItems = $ppmp->items
            ->map(function ($item) use ($approvedByLineage): array {
                $budgetCents = $this->moneyToCents($item->estimated_budget);
                $lineageUuid = trim((string) ($item->lineage_uuid ?? ''));
                $approvedCents = $lineageUuid !== ''
                    ? ($approvedByLineage[$lineageUuid] ?? 0)
                    : $this->moneyToCents($item->approved_pr_amount);
                $remainingCents = max(0, $budgetCents - $approvedCents);

                return [
                    'id' => $item->id,
                    'sort_order' => $item->sort_order,
                    'description_objective' => $item->description_objective,
                    'project_type' => $item->project_type,
                    'quantity_size' => $item->quantity_size,
                    'source_of_funds' => $item->source_of_funds,
                    'estimated_budget' => number_format($budgetCents / 100, 2, '.', ''),
                    'approved_pr_amount' => number_format($approvedCents / 100, 2, '.', ''),
                    'remaining_balance' => number_format($remainingCents / 100, 2, '.', ''),
                    'details' => $item->details->map(fn ($detail): array => [
                        'id' => $detail->id,
                        'project_type' => $detail->project_type,
                        'quantity' => $detail->quantity,
                        'unit' => $detail->unit,
                        'item_description' => $detail->item_description,
                        'size_specification' => $detail->size_specification,
                        'estimated_amount' => $detail->estimated_amount,
                        'sort_order' => $detail->sort_order,
                    ])->values(),
                ];
            })
            ->values();

        return Inertia::render(
            'purchase-requests/edit',
            [
                'purchaseRequest' => [
                    'id' => $purchaseRequest->id,
                    'pr_no' => $purchaseRequest->pr_no,
                    'entity_name' => $purchaseRequest->entity_name,
                    'fund_cluster' => $purchaseRequest->fund_cluster ?? '',
                    'responsibility_center_code' => $purchaseRequest->responsibility_center_code ?? '',
                    'pr_date' => $purchaseRequest->pr_date?->format('Y-m-d') ?? '',
                    'purpose' => $purchaseRequest->purpose ?? '',
                    'requested_by_name' => $purchaseRequest->requested_by_name ?? '',
                    'requested_by_designation' => $purchaseRequest->requested_by_designation ?? '',
                    'approved_by_name' => $purchaseRequest->approved_by_name ?? '',
                    'approved_by_designation' => $purchaseRequest->approved_by_designation ?? '',
                    'status' => $purchaseRequest->status,
                    'remarks' => $purchaseRequest->remarks,
                    'items' => $purchaseRequest->items->map(fn ($item): array => [
                        'id' => $item->id,
                        'ppmp_item_id' => (string) $item->ppmp_item_id,
                        'ppmp_item_detail_id' => (string) $item->ppmp_item_detail_id,
                        'stock_property_no' => $item->stock_property_no ?? '',
                        'unit' => $item->unit ?? '',
                        'item_description' => $item->item_description ?? '',
                        'quantity' => (string) $item->quantity,
                        'unit_cost' => (string) $item->unit_cost,
                        'sort_order' => $item->sort_order,
                    ])->values(),
                ],
                'ppmp' => [
                    'id' => $ppmp->id,
                    'ppmp_no' => $ppmp->ppmp_no,
                    'fiscal_year' => $ppmp->fiscal_year,
                    'total_budget' => $ppmp->total_budget,
                    'approved_pr_total' => number_format($seriesApprovedPrTotalCents / 100, 2, '.', ''),
                    'office' => [
                        'id' => $ppmp->office->id,
                        'code' => $ppmp->office->code,
                        'name' => $ppmp->office->name,
                    ],
                    'items' => $ppmpItems,
                ],
            ]
        );
    }

    /**
     * Update an existing draft or returned Purchase Request.
     */
    public function update(
        UpdatePurchaseRequestRequest $request,
        PurchaseRequest $purchaseRequest
    ): RedirectResponse {
        $this->ensureCanEdit(
            $request,
            $purchaseRequest
        );

        $validated = $request->validated();
        $user = $request->user();

        $isSubmitting = ($validated['action'] ?? 'draft') === 'submit';

        if ($isSubmitting) {
            if ($purchaseRequest->status === 'draft') {
                abort_unless(
                    $user->can('prs.submit'),
                    403,
                    'You do not have permission to submit Purchase Requests.'
                );
            } elseif ($purchaseRequest->status === 'returned_for_revision') {
                abort_unless(
                    $user->can('prs.resubmit'),
                    403,
                    'You do not have permission to resubmit Purchase Requests.'
                );
            }
        }

        $ppmp = $purchaseRequest->ppmp;
        $ppmp->loadMissing(['items.details']);
        $ppmpItems = $ppmp->items->keyBy('id');

        DB::transaction(function () use (
            $request,
            $validated,
            $user,
            $purchaseRequest,
            $ppmpItems,
            $isSubmitting
        ): void {
            $lockedPr = PurchaseRequest::query()
                ->whereKey($purchaseRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedPr->isEditable()) {
                throw ValidationException::withMessages([
                    'workflow' => 'This Purchase Request is no longer editable.',
                ]);
            }

            $oldStatus = $lockedPr->status;
            $oldTotal = $lockedPr->total_amount;

            $lockedPr->forceFill([
                'entity_name' => $validated['entity_name'],
                'fund_cluster' => $validated['fund_cluster'] ?: null,
                'responsibility_center_code' => $validated['responsibility_center_code'] ?: null,
                'pr_date' => $validated['pr_date'] ?: null,
                'purpose' => $validated['purpose'] ?: null,
                'requested_by_name' => $validated['requested_by_name'] ?: null,
                'requested_by_designation' => $validated['requested_by_designation'] ?: null,
                'approved_by_name' => $validated['approved_by_name'] ?: null,
                'approved_by_designation' => $validated['approved_by_designation'] ?: null,
                'updated_by' => $user->id,
            ])->save();

            $lockedPr->items()->delete();

            $totalRequestCents = 0;

            foreach ($validated['items'] as $index => $itemData) {
                $sourceItem = $ppmpItems->get((int) $itemData['ppmp_item_id']);
                $sourceDetail = $sourceItem?->details->firstWhere(
                    'id',
                    (int) ($itemData['ppmp_item_detail_id'] ?? 0)
                );

                if (! $sourceItem || ! $sourceDetail) {
                    throw ValidationException::withMessages([
                        "items.{$index}.ppmp_item_detail_id" => 'Invalid PPMP requirement selected.',
                    ]);
                }

                $quantity = filled($itemData['quantity'] ?? null)
                    ? (float) $itemData['quantity']
                    : (filled($sourceDetail->quantity) ? (float) $sourceDetail->quantity : 1);

                $unitCostCents = $this->moneyToCents($itemData['unit_cost'] ?? 0);
                $totalCostCents = (int) round($quantity * $unitCostCents);
                $totalRequestCents += $totalCostCents;

                $description = trim((string) ($itemData['item_description'] ?? ''));
                if ($description === '') {
                    $description = trim((string) ($sourceDetail->item_description ?? ''));
                }
                if ($description === '') {
                    $description = $sourceItem->description_objective;
                }

                $unit = trim((string) ($itemData['unit'] ?? ''));
                if ($unit === '') {
                    $unit = trim((string) ($sourceDetail->unit ?? ''));
                }

                $lockedPr->items()->create([
                    'ppmp_item_id' => $sourceItem->id,
                    'ppmp_item_detail_id' => $sourceDetail->id,
                    'stock_property_no' => $itemData['stock_property_no'] ?: null,
                    'unit' => $unit !== '' ? $unit : null,
                    'item_description' => $description,
                    'quantity' => number_format($quantity, 3, '.', ''),
                    'unit_cost' => number_format($unitCostCents / 100, 2, '.', ''),
                    'total_cost' => number_format($totalCostCents / 100, 2, '.', ''),
                    'sort_order' => $index + 1,
                ]);
            }

            $totalAmount = number_format($totalRequestCents / 100, 2, '.', '');
            $lockedPr->forceFill(['total_amount' => $totalAmount])->save();

            $this->auditLogService->record(
                module: 'purchase-request',
                action: 'pr-updated',
                subject: $lockedPr,
                description: "Updated {$lockedPr->pr_no}.",
                oldValues: ['total_amount' => $oldTotal],
                newValues: ['total_amount' => $totalAmount],
                request: $request
            );

            if ($isSubmitting) {
                $this->workflowController->validateReadyForSubmission($lockedPr);

                $lockedPr->forceFill([
                    'status' => 'submitted',
                    'submitted_at' => now(),
                    'returned_at' => null,
                    'remarks' => null,
                    'updated_by' => $user->id,
                ])->save();

                $action = $oldStatus === 'returned_for_revision' ? 'resubmit' : 'submit';
                $remarks = $oldStatus === 'returned_for_revision'
                    ? 'Revised Purchase Request resubmitted for review.'
                    : 'Purchase Request submitted for GSPS review.';

                $lockedPr->statusHistories()->create([
                    'from_status' => $oldStatus,
                    'to_status' => 'submitted',
                    'action' => $action,
                    'remarks' => $remarks,
                    'action_by' => $user->id,
                    'acted_at' => now(),
                ]);

                $this->auditLogService->record(
                    module: 'purchase-request',
                    action: $action === 'resubmit' ? 'pr-resubmitted' : 'pr-submitted',
                    subject: $lockedPr,
                    description: "{$lockedPr->pr_no} was " . ($action === 'resubmit' ? 'resubmitted after revision.' : 'submitted for review.'),
                    oldValues: [
                        'status' => $oldStatus,
                    ],
                    newValues: [
                        'status' => 'submitted',
                    ],
                    request: $request
                );
            }
        });

        $message = $isSubmitting
            ? "{$purchaseRequest->pr_no} was submitted for GSPS review."
            : "{$purchaseRequest->pr_no} was updated successfully.";

        return redirect()
            ->route('purchase-requests.show', $purchaseRequest->id)
            ->with('success', $message);
    }

    /**
     * Display one Purchase Request.
     *
     * Each PR line keeps both:
     * - the exact historical PPMP parent item, and
     * - the exact historical Item No. 2 + Item No. 3
     *   child requirement selected when the PR was made.
     *
     * Historical PR rows created before
     * ppmp_item_detail_id existed remain readable because
     * that relationship is intentionally nullable.
     */
    public function show(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user->can(
                'prs.view-all'
            )
            || (
                $user->can(
                    'prs.view-own'
                )
                && $user->office_id !== null
                && $user->office_id ===
                    $purchaseRequest
                        ->office_id
            ),
            403,
            'You are not authorized to view this Purchase Request.'
        );

        $purchaseRequest->load([
            'ppmp:id,ppmp_no,fiscal_year,plan_type,indicative_no,status,total_budget',
            'office:id,code,name',
            'requester:id,name,position_title',
            'approvalRecorder:id,name,position_title',
            'attachments.uploadedBy:id,name',
            'statusHistories.actionBy:id,name',

            /*
             * Exact historical parent + child PPMP links.
             */
            'items' => fn ($query) =>
                $query
                    ->with([
                        'ppmpItem:id,ppmp_id,lineage_uuid,description_objective,source_of_funds,estimated_budget,sort_order',

                        'ppmpItemDetail:id,ppmp_item_id,lineage_uuid,project_type,quantity,unit,item_description,size_specification,estimated_amount,sort_order',
                    ])
                    ->orderBy(
                        'sort_order'
                    ),
        ]);

        $items =
            $purchaseRequest
                ->items
                ->map(
                    function (
                        $item
                    ): array {
                        $parent =
                            $item
                                ->ppmpItem;

                        $detail =
                            $item
                                ->ppmpItemDetail;

                        return [
                            'id' =>
                                $item->id,

                            'ppmp_item_id' =>
                                $item
                                    ->ppmp_item_id,

                            'ppmp_item_detail_id' =>
                                $item
                                    ->ppmp_item_detail_id,

                            'stock_property_no' =>
                                $item
                                    ->stock_property_no,

                            'unit' =>
                                $item->unit,

                            'item_description' =>
                                $item
                                    ->item_description,

                            'quantity' =>
                                $item
                                    ->quantity,

                            'unit_cost' =>
                                $item
                                    ->unit_cost,

                            'total_cost' =>
                                $item
                                    ->total_cost,

                            'sort_order' =>
                                $item
                                    ->sort_order,

                            /*
                             * Exact historical PPMP parent.
                             */
                            'ppmp_item' =>
                                $parent
                                    ? [
                                        'id' =>
                                            $parent->id,

                                        'sort_order' =>
                                            $parent
                                                ->sort_order,

                                        'description_objective' =>
                                            $parent
                                                ->description_objective,

                                        'source_of_funds' =>
                                            $parent
                                                ->source_of_funds,

                                        'estimated_budget' =>
                                            $parent
                                                ->estimated_budget,
                                    ]
                                    : null,

                            /*
                             * Exact historical Item No. 2 + Item No. 3
                             * child. Null is valid only for legacy PRs
                             * created before this field existed.
                             */
                            'ppmp_item_detail' =>
                                $detail
                                    ? [
                                        'id' =>
                                            $detail->id,

                                        'sort_order' =>
                                            $detail
                                                ->sort_order,

                                        'project_type' =>
                                            $detail
                                                ->project_type,

                                        'quantity' =>
                                            $detail
                                                ->quantity,

                                        'unit' =>
                                            $detail
                                                ->unit,

                                        'item_description' =>
                                            $detail
                                                ->item_description,

                                        'size_specification' =>
                                            $detail
                                                ->size_specification,

                                        'estimated_amount' =>
                                            $detail
                                                ->estimated_amount,
                                    ]
                                    : null,
                        ];
                    }
                )
                ->values();

        return Inertia::render(
            'purchase-requests/show',
            [
                'purchaseRequest' => [
                    'id' =>
                        $purchaseRequest
                            ->id,

                    'pr_no' =>
                        $purchaseRequest
                            ->pr_no,

                    'status' =>
                        $purchaseRequest
                            ->status,

                    'entity_name' =>
                        $purchaseRequest
                            ->entity_name,

                    'fund_cluster' =>
                        $purchaseRequest
                            ->fund_cluster,

                    'responsibility_center_code' =>
                        $purchaseRequest
                            ->responsibility_center_code,

                    'pr_date' =>
                        $purchaseRequest
                            ->pr_date
                            ?->format(
                                'Y-m-d'
                            ),

                    'purpose' =>
                        $purchaseRequest
                            ->purpose,

                    'total_amount' =>
                        $purchaseRequest
                            ->total_amount,

                    'requested_by_name' =>
                        $purchaseRequest
                            ->requested_by_name,

                    'requested_by_designation' =>
                        $purchaseRequest
                            ->requested_by_designation,

                    'approved_by_name' =>
                        $purchaseRequest
                            ->approved_by_name,

                    'approved_by_designation' =>
                        $purchaseRequest
                            ->approved_by_designation,

                    'created_at' =>
                        $purchaseRequest
                            ->created_at
                            ?->format(
                                'M d, Y h:i A'
                            ),

                    'updated_at' =>
                        $purchaseRequest
                            ->updated_at
                            ?->format(
                                'M d, Y h:i A'
                            ),

                    'ppmp' => [
                        'id' =>
                            $purchaseRequest
                                ->ppmp
                                ->id,

                        'ppmp_no' =>
                            $purchaseRequest
                                ->ppmp
                                ->ppmp_no,

                        'fiscal_year' =>
                            $purchaseRequest
                                ->ppmp
                                ->fiscal_year,

                        'plan_type' =>
                            $purchaseRequest
                                ->ppmp
                                ->plan_type,

                        'indicative_no' =>
                            $purchaseRequest
                                ->ppmp
                                ->indicative_no,

                        'status' =>
                            $purchaseRequest
                                ->ppmp
                                ->status,

                        'total_budget' =>
                            $purchaseRequest
                                ->ppmp
                                ->total_budget,
                    ],

                    'office' => [
                        'id' =>
                            $purchaseRequest
                                ->office
                                ->id,

                        'code' =>
                            $purchaseRequest
                                ->office
                                ->code,

                        'name' =>
                            $purchaseRequest
                                ->office
                                ->name,
                    ],

                    'requester' => [
                        'id' =>
                            $purchaseRequest
                                ->requester
                                ->id,

                        'name' =>
                            $purchaseRequest
                                ->requester
                                ->name,

                        'position_title' =>
                            $purchaseRequest
                                ->requester
                                ->position_title,
                    ],

                    'remarks' => $purchaseRequest->remarks,
                    'submitted_at' => $purchaseRequest->submitted_at?->format('M d, Y h:i A'),
                    'returned_at' => $purchaseRequest->returned_at?->format('M d, Y h:i A'),
                    'approved_at' => $purchaseRequest->approved_at?->format('M d, Y h:i A'),
                    'approval_recorder' => $purchaseRequest->approvalRecorder ? [
                        'id' => $purchaseRequest->approvalRecorder->id,
                        'name' => $purchaseRequest->approvalRecorder->name,
                        'position_title' => $purchaseRequest->approvalRecorder->position_title,
                    ] : null,
                    'attachments' => $purchaseRequest->attachments->map(fn ($att): array => [
                        'id' => $att->id,
                        'document_type' => $att->document_type,
                        'original_name' => $att->original_name,
                        'file_size' => $att->file_size,
                        'created_at' => $att->created_at?->format('M d, Y h:i A'),
                        'uploaded_by' => $att->uploadedBy?->name ?? 'System',
                    ])->values(),
                    'status_histories' => $purchaseRequest->statusHistories->map(fn ($hist): array => [
                        'id' => $hist->id,
                        'from_status' => $hist->from_status,
                        'to_status' => $hist->to_status,
                        'action' => $hist->action,
                        'remarks' => $hist->remarks,
                        'action_by' => $hist->actionBy?->name ?? 'System',
                        'acted_at' => $hist->acted_at?->format('M d, Y h:i A'),
                    ])->values(),
                    'items' =>
                        $items,
                ],

                'can' => [
                    'update' => $user->can('prs.update-own')
                        && $purchaseRequest->isEditable()
                        && ($user->can('prs.view-all') || $user->office_id === $purchaseRequest->office_id),
                    'submit' => $user->can('prs.submit')
                        && $purchaseRequest->status === 'draft'
                        && ($user->can('prs.view-all') || $user->office_id === $purchaseRequest->office_id),
                    'resubmit' => $user->can('prs.resubmit')
                        && $purchaseRequest->status === 'returned_for_revision'
                        && ($user->can('prs.view-all') || $user->office_id === $purchaseRequest->office_id),
                    'return' => $user->can('prs.return')
                        && $purchaseRequest->status === 'submitted',
                    'approve' => $user->can('prs.approve')
                        && $user->can('prs.upload-approved-copy')
                        && $purchaseRequest->status === 'submitted',
                ],

                'flash' => [
                    'success' =>
                        $request
                            ->session()
                            ->get(
                                'success'
                            ),
                ],
            ]
        );
    }

    /**
     * Only the End User / PPMP Coordinator from
     * the owning division may edit a draft or returned PR.
     */
    private function ensureCanEdit(
        Request $request,
        PurchaseRequest $purchaseRequest
    ): void {
        $user = $request->user();

        abort_unless(
            $user->can('prs.update-own')
            && $purchaseRequest->isEditable()
            && (
                $user->can('prs.view-all')
                || (
                    $user->office_id !== null
                    && $user->office_id === $purchaseRequest->office_id
                )
            ),
            403,
            'You are not authorized to edit this Purchase Request.'
        );
    }

    /**
     * Only the End User / PPMP Coordinator from
     * the owning division may create a PR.
     */
    private function ensureCanCreate(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        abort_unless(
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'prs.create'
            )
            && $user->office_id
                === $ppmp->office_id,
            403,
            'You are not authorized to create a Purchase Request for this PPMP.'
        );

        abort_unless(
            $ppmp->status ===
                'approved',
            403,
            'Purchase Requests may only be created from an approved PPMP.'
        );
    }

    /**
     * Return cumulative APPROVED Purchase Request
     * utilization keyed by stable PPMP item lineage UUID.
     *
     * This intentionally follows historical PR rows back
     * to the exact PPMP item version they were approved
     * against, then groups by ppmp_items.lineage_uuid.
     *
     * @param array<int, string> $lineageUuids
     * @return array<string, int>
     */
    private function approvedPrUtilizationByLineage(
        array $lineageUuids
    ): array {
        if (
            $lineageUuids === []
        ) {
            return [];
        }

        $rows =
            PurchaseRequestItem::query()
                ->selectRaw(
                    'ppmp_items.lineage_uuid AS lineage_uuid, '
                    .'SUM(purchase_request_items.total_cost) AS utilized_total'
                )
                ->join(
                    'ppmp_items',
                    'ppmp_items.id',
                    '=',
                    'purchase_request_items.ppmp_item_id'
                )
                ->join(
                    'purchase_requests',
                    'purchase_requests.id',
                    '=',
                    'purchase_request_items.purchase_request_id'
                )
                ->where(
                    'purchase_requests.status',
                    'approved'
                )
                ->whereNull(
                    'purchase_requests.deleted_at'
                )
                ->whereIn(
                    'ppmp_items.lineage_uuid',
                    $lineageUuids
                )
                ->groupBy(
                    'ppmp_items.lineage_uuid'
                )
                ->get();

        $result = [];

        foreach (
            $rows
            as $row
        ) {
            $lineageUuid =
                trim(
                    (string) (
                        $row
                            ->lineage_uuid
                        ?? ''
                    )
                );

            if (
                $lineageUuid === ''
            ) {
                continue;
            }

            $result[
                $lineageUuid
            ] =
                $this
                    ->moneyToCents(
                        $row
                            ->utilized_total
                    );
        }

        return $result;
    }

    /**
     * Return cumulative APPROVED PR utilization for the
     * whole PPMP series.
     *
     * Historical versions are intentionally included.
     * An approved PR from Indicative No. 1 must still
     * consume budget when creating a PR from No. 2, No. 3,
     * and later revisions.
     *
     * The current PPMP ID is used only as a safe fallback
     * for legacy data that has no ppmp_series_id.
     */
    private function approvedPrTotalForSeries(
        ?int $seriesId,
        int $currentPpmpId
    ): int {
        $query =
            PurchaseRequestItem::query()
                ->join(
                    'purchase_requests',
                    'purchase_requests.id',
                    '=',
                    'purchase_request_items.purchase_request_id'
                )
                ->join(
                    'ppmp_items',
                    'ppmp_items.id',
                    '=',
                    'purchase_request_items.ppmp_item_id'
                )
                ->join(
                    'ppmps',
                    'ppmps.id',
                    '=',
                    'ppmp_items.ppmp_id'
                )
                ->where(
                    'purchase_requests.status',
                    'approved'
                )
                ->whereNull(
                    'purchase_requests.deleted_at'
                );

        if (
            $seriesId !== null
        ) {
            $query->where(
                'ppmps.ppmp_series_id',
                $seriesId
            );
        } else {
            $query->where(
                'ppmps.id',
                $currentPpmpId
            );
        }

        return $this
            ->moneyToCents(
                $query->sum(
                    'purchase_request_items.total_cost'
                )
            );
    }

    /**
     * Convert database/form money to integer cents.
     */
    private function moneyToCents(
        string|int|float|null $amount
    ): int {
        if ($amount === null) {
            return 0;
        }

        $normalized =
            str_replace(
                ',',
                '',
                (string) $amount
            );

        return (int) round(
            ((float) $normalized)
            * 100
        );
    }
}
