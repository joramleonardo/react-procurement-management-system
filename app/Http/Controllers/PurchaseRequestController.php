<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseRequest\StorePurchaseRequestRequest;
use App\Models\Ppmp;
use App\Models\PurchaseRequest;
use App\Services\AuditLogService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseRequestController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
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
                $query->orderBy(
                    'sort_order'
                ),
        ]);

        $items = $ppmp->items
            ->map(function ($item) {
                $budgetCents =
                    $this->moneyToCents(
                        $item->estimated_budget
                    );

                $approvedCents =
                    $this->moneyToCents(
                        $item->approved_pr_amount
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
                ];
            })
            ->values();

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
                        $ppmp->approved_pr_total,

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
        $validated =
            $request->validated();

        $user =
            $request->user();

        $ppmp->loadMissing('items');

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
                    $ppmpItems
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
                                ] ?: null,

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

                        abort_unless(
                            $sourceItem !== null,
                            422,
                            'Invalid PPMP item.'
                        );

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
                                : 1;

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
                                $sourceItem
                                    ->description_objective;
                        }

                        $purchaseRequest
                            ->items()
                            ->create([
                                'ppmp_item_id' =>
                                    $sourceItem->id,

                                'stock_property_no' =>
                                    $itemData[
                                        'stock_property_no'
                                    ] ?: null,

                                'unit' =>
                                    $itemData[
                                        'unit'
                                    ] ?: null,

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

                    return $purchaseRequest;
                }
            );

        return redirect()
            ->route(
                'purchase-requests.index'
            )
            ->with(
                'success',
                "{$purchaseRequest->pr_no} was saved as draft."
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
