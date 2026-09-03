<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ppmp\StorePpmpRequest;
use App\Http\Requests\Ppmp\UpdatePpmpRequest;
use App\Models\Ppmp;
use App\Models\PpmpSeries;
use App\Models\PurchaseRequestItem;
use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PpmpController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Display PPMP records accessible to the current user.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless(
            $user->can('ppmps.view-own')
            || $user->can('ppmps.view-all'),
            403
        );

        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:255',
            ],

            'fiscal_year' => [
                'nullable',
                'integer',
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

            'plan_type' => [
                'nullable',

                Rule::in([
                    'indicative',
                    'final',
                ]),
            ],
        ]);

        $search = trim(
            (string) (
                $validated['search']
                ?? ''
            )
        );

        $fiscalYear =
            $validated['fiscal_year']
            ?? null;

        $status =
            (string) (
                $validated['status']
                ?? ''
            );

        $planType =
            (string) (
                $validated['plan_type']
                ?? ''
            );

        $query = Ppmp::query()
            ->with([
                'office:id,code,name',

                'coordinator:id,name',

                'series:id,original_budget,approved_pr_total',

                'series.ppmps:id,ppmp_series_id,ppmp_no,plan_type,indicative_no,status,updated_at',
            ])
            ->withCount('items');

        if (
            ! $user->can(
                'ppmps.view-all'
            )
        ) {
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
                ) use (
                    $search
                ): void {
                    $query->where(
                        function (
                            Builder $searchQuery
                        ) use (
                            $search
                        ): void {
                            $searchQuery
                                ->where(
                                    'ppmp_no',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhereHas(
                                    'office',
                                    function (
                                        Builder $officeQuery
                                    ) use (
                                        $search
                                    ): void {
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
                                )
                                ->orWhereHas(
                                    'coordinator',
                                    function (
                                        Builder $userQuery
                                    ) use (
                                        $search
                                    ): void {
                                        $userQuery
                                            ->where(
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
                $fiscalYear !== null,
                fn (
                    Builder $query
                ) =>
                    $query->where(
                        'fiscal_year',
                        $fiscalYear
                    )
            )
            ->when(
                $status !== '',
                fn (
                    Builder $query
                ) =>
                    $query->where(
                        'status',
                        $status
                    )
            )
            ->when(
                $planType !== '',
                fn (
                    Builder $query
                ) =>
                    $query->where(
                        'plan_type',
                        $planType
                    )
            );

        $ppmps = $query
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString()
            ->through(
                function (
                    Ppmp $ppmp
                ): array {
                    $seriesVersions =
                        $ppmp->series
                            ?->ppmps
                        ?? collect();

                    $originalPpmp =
                        $seriesVersions
                            ->first(
                                fn (
                                    Ppmp $version
                                ) =>
                                    $version
                                        ->plan_type ===
                                        'indicative'
                                    && (
                                        (int) $version
                                            ->indicative_no
                                    ) === 1
                            );

                    $latestIndicativeNo =
                        $seriesVersions
                            ->where(
                                'plan_type',
                                'indicative'
                            )
                            ->max(
                                'indicative_no'
                            );

                    return [
                        'id' =>
                            $ppmp->id,

                        'ppmp_series_id' =>
                            $ppmp
                                ->ppmp_series_id,

                        'ppmp_no' =>
                            $ppmp->ppmp_no,

                        'fiscal_year' =>
                            $ppmp->fiscal_year,

                        'plan_type' =>
                            $ppmp->plan_type,

                        'indicative_no' =>
                            $ppmp->indicative_no,

                        'version_label' =>
                            $ppmp
                                ->version_label,

                        'original_ppmp_id' =>
                            $originalPpmp
                                ?->id,

                        'original_ppmp_no' =>
                            $originalPpmp
                                ?->ppmp_no,

                        'is_latest_version' =>
                            $ppmp
                                ->plan_type ===
                                'indicative'
                            && $latestIndicativeNo
                                !== null
                            && (
                                (int) $ppmp
                                    ->indicative_no
                            ) === (
                                (int) $latestIndicativeNo
                            ),

                        'status' =>
                            $ppmp->status,

                        'total_budget' =>
                            $ppmp->total_budget,

                        'original_budget' =>
                            $ppmp->series
                                ?->original_budget,

                        'items_count' =>
                            $ppmp->items_count,

                        'office' => [
                            'id' =>
                                $ppmp->office->id,

                            'code' =>
                                $ppmp->office->code,

                            'name' =>
                                $ppmp->office->name,
                        ],

                        'coordinator' => [
                            'id' =>
                                $ppmp
                                    ->coordinator
                                    ->id,

                            'name' =>
                                $ppmp
                                    ->coordinator
                                    ->name,
                        ],

                        'updated_at' =>
                            $ppmp
                                ->updated_at
                                ?->format(
                                    'M d, Y h:i A'
                                ),
                    ];
                }
            );

        $yearsQuery =
            Ppmp::query()
                ->select(
                    'fiscal_year'
                )
                ->distinct();

        if (
            ! $user->can(
                'ppmps.view-all'
            )
        ) {
            $yearsQuery->where(
                'office_id',
                $user->office_id
            );
        }

        $fiscalYears =
            $yearsQuery
                ->orderByDesc(
                    'fiscal_year'
                )
                ->pluck(
                    'fiscal_year'
                )
                ->values();

        return Inertia::render(
            'ppmps/index',
            [
                'ppmps' =>
                    $ppmps,

                'filters' => [
                    'search' =>
                        $search,

                    'fiscal_year' =>
                        $fiscalYear
                            ? (string)
                                $fiscalYear
                            : '',

                    'status' =>
                        $status,

                    'plan_type' =>
                        $planType,
                ],

                'fiscalYears' =>
                    $fiscalYears,

                'can' => [
                    'create' =>
                        $user->hasRole(
                            'ppmp-coordinator'
                        )
                        && $user->can(
                            'ppmps.create'
                        )
                        && $user->office_id
                            !== null,
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
     * Display the Create PPMP page.
     */
    public function create(
        Request $request
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.create'
            ),
            403,
            'Only PPMP Coordinators may create a PPMP.'
        );

        abort_if(
            $user->office_id
                === null,
            403,
            'Your account must be assigned to an office before creating a PPMP.'
        );

        $user->loadMissing(
            'office:id,code,name'
        );

        return Inertia::render(
            'ppmps/create',
            [
                'office' => [
                    'id' =>
                        $user
                            ->office
                            ->id,

                    'code' =>
                        $user
                            ->office
                            ->code,

                    'name' =>
                        $user
                            ->office
                            ->name,
                ],

                'coordinator' => [
                    'id' =>
                        $user->id,

                    'name' =>
                        $user->name,

                    'position_title' =>
                        $user
                            ->position_title,
                ],

                'currentFiscalYear' =>
                    now()->year,

                /*
                 * System-controlled values.
                 */
                'planType' =>
                    'indicative',

                'indicativeNo' =>
                    1,
            ]
        );
    }

    /**
     * Save a new PPMP Series and its
     * Indicative No. 1 as Draft.
     */
    public function store(
        StorePpmpRequest $request
    ): RedirectResponse {
        $validated =
            $request->validated();

        $user =
            $request->user();

        $ppmp =
            DB::transaction(
                function () use (
                    $validated,
                    $user,
                    $request
                ): Ppmp {
                    /*
                     * Create the PPMP series first.
                     *
                     * original_budget starts at zero
                     * and will be synchronized with
                     * Indicative No. 1 after its items
                     * have been saved.
                     */
                    $series =
                        PpmpSeries::create([
                            'office_id' =>
                                $user
                                    ->office_id,

                            'fiscal_year' =>
                                $validated[
                                    'fiscal_year'
                                ],

                            'original_budget' =>
                                '0.00',

                            'approved_pr_total' =>
                                '0.00',

                            'created_by' =>
                                $user->id,

                            'updated_by' =>
                                $user->id,
                        ]);

                    /*
                     * The coordinator never controls:
                     *
                     * - PPMP Series
                     * - Indicative number
                     * - PPMP type
                     * - Office
                     * - Coordinator
                     * - Workflow status
                     */
                    $ppmp =
                        Ppmp::create([
                            'ppmp_series_id' =>
                                $series->id,

                            'indicative_no' =>
                                1,

                            'revised_from_ppmp_id' =>
                                null,

                            'ppmp_no' =>
                                'TEMP-'
                                .Str::uuid(),

                            'fiscal_year' =>
                                $validated[
                                    'fiscal_year'
                                ],

                            'plan_type' =>
                                'indicative',

                            'office_id' =>
                                $user
                                    ->office_id,

                            'coordinator_id' =>
                                $user->id,

                            'prepared_by_name' =>
                                $validated[
                                    'prepared_by_name'
                                ] ?: null,

                            'prepared_by_position' =>
                                $validated[
                                    'prepared_by_position'
                                ] ?: null,

                            'submitted_by_name' =>
                                $validated[
                                    'submitted_by_name'
                                ] ?: null,

                            'submitted_by_position' =>
                                $validated[
                                    'submitted_by_position'
                                ] ?: null,

                            'status' =>
                                'draft',

                            'total_budget' =>
                                '0.00',

                            'approved_pr_total' =>
                                '0.00',

                            'created_by' =>
                                $user->id,

                            'updated_by' =>
                                $user->id,
                        ]);

                    /*
                     * Example:
                     *
                     * PPMP-2026-0007
                     */
                    $ppmp
                        ->forceFill([
                            'ppmp_no' =>
                                sprintf(
                                    'PPMP-%d-%04d',
                                    $ppmp
                                        ->fiscal_year,
                                    $ppmp->id
                                ),
                        ])
                        ->save();

                    $totalCents = 0;

                    foreach (
                        $validated['items']
                        as $index =>
                            $item
                    ) {
                        if (
                            ! $this
                                ->itemHasContent(
                                    $item
                                )
                        ) {
                            continue;
                        }

                        $budgetCents =
                            $this
                                ->moneyToCents(
                                    $item[
                                        'estimated_budget'
                                    ]
                                    ?? 0
                                );

                        $totalCents +=
                            $budgetCents;

                        $ppmp
                            ->items()
                            ->create([
                                'description_objective' =>
                                    $item[
                                        'description_objective'
                                    ]
                                    ?? '',

                                'project_type' =>
                                    $item[
                                        'project_type'
                                    ]
                                    ?? '',

                                'quantity_size' =>
                                    $item[
                                        'quantity_size'
                                    ]
                                    ?? '',

                                'recommended_mode_of_procurement' =>
                                    $item[
                                        'recommended_mode_of_procurement'
                                    ]
                                    ?? '',

                                'pre_procurement_conference' =>
                                    (bool) (
                                        $item[
                                            'pre_procurement_conference'
                                        ]
                                        ?? false
                                    ),

                                'procurement_start_month' =>
                                    $item[
                                        'procurement_start_month'
                                    ]
                                    ?? '',

                                'procurement_end_month' =>
                                    $item[
                                        'procurement_end_month'
                                    ]
                                    ?? '',

                                'expected_delivery_month' =>
                                    $item[
                                        'expected_delivery_month'
                                    ]
                                    ?? '',

                                'source_of_funds' =>
                                    $item[
                                        'source_of_funds'
                                    ]
                                    ?? '',

                                'estimated_budget' =>
                                    $this
                                        ->centsToMoney(
                                            $budgetCents
                                        ),

                                'approved_pr_amount' =>
                                    '0.00',

                                'remarks' =>
                                    $item[
                                        'remarks'
                                    ]
                                    ?? null,

                                'sort_order' =>
                                    $index + 1,
                            ]);
                    }

                    $totalBudget =
                        $this
                            ->centsToMoney(
                                $totalCents
                            );

                    /*
                     * This is still Indicative No. 1,
                     * so its Draft total establishes /
                     * updates the prospective original
                     * budget.
                     *
                     * Once Indicative No. 1 becomes
                     * approved, it will no longer be
                     * editable and this value becomes
                     * permanent.
                     */
                    $ppmp
                        ->forceFill([
                            'total_budget' =>
                                $totalBudget,
                        ])
                        ->save();

                    $series->update([
                        'original_budget' =>
                            $totalBudget,

                        'updated_by' =>
                            $user->id,
                    ]);

                    $ppmp
                        ->statusHistories()
                        ->create([
                            'from_status' =>
                                null,

                            'to_status' =>
                                'draft',

                            'action' =>
                                'create',

                            'remarks' =>
                                'Indicative No. 1 created and saved as draft.',

                            'action_by' =>
                                $user->id,

                            'acted_at' =>
                                now(),
                        ]);

                    $this
                        ->auditLogService
                        ->record(
                            module:
                                'ppmp',

                            action:
                                'ppmp-created',

                            subject:
                                $ppmp,

                            description:
                                "Created {$ppmp->ppmp_no} - Indicative No. 1 as draft.",

                            newValues: [
                                'ppmp_no' =>
                                    $ppmp
                                        ->ppmp_no,

                                'ppmp_series_id' =>
                                    $series
                                        ->id,

                                'indicative_no' =>
                                    1,

                                'fiscal_year' =>
                                    $ppmp
                                        ->fiscal_year,

                                'plan_type' =>
                                    'indicative',

                                'office_id' =>
                                    $ppmp
                                        ->office_id,

                                'status' =>
                                    'draft',

                                'total_budget' =>
                                    $totalBudget,

                                'original_budget' =>
                                    $totalBudget,
                            ],

                            request:
                                $request
                        );

                    return $ppmp;
                }
            );

        return redirect()
            ->route(
                'ppmps.index'
            )
            ->with(
                'success',
                "{$ppmp->ppmp_no} - Indicative No. 1 was saved as draft."
            );
    }

    /**
     * Determine whether a draft item row contains data.
     *
     * @param array<string, mixed> $item
     */
    private function itemHasContent(
        array $item
    ): bool {
        $fields = [
            'description_objective',
            'project_type',
            'quantity_size',
            'recommended_mode_of_procurement',
            'procurement_start_month',
            'procurement_end_month',
            'expected_delivery_month',
            'source_of_funds',
            'estimated_budget',
            'remarks',
        ];

        foreach (
            $fields
            as $field
        ) {
            $value =
                $item[$field]
                ?? null;

            if (
                $value !== null
                && $value !== ''
            ) {
                return true;
            }
        }

        return false;
    }

    public function show(
        Request $request,
        Ppmp $ppmp
    ): Response {
        $this->ensureCanView(
            $request,
            $ppmp
        );

        $ppmp->load([
            'series:id,office_id,fiscal_year,original_budget,approved_pr_total',

            'revisedFrom:id,ppmp_no,indicative_no',

            'office:id,code,name',

            'coordinator:id,name,position_title',

            'items.attachments',

            'attachments',

            'approver:id,name',

            'statusHistories.actionBy:id,name',
        ]);

        $approvedCopy =
            $ppmp
                ->attachments
                ->firstWhere(
                    'document_type',
                    'approved_ppmp'
                );

        $user =
            $request->user();

        $isCoordinatorOwner =
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->office_id
                === $ppmp
                    ->office_id;

        /*
         * Load the complete PPMP version history for this
         * series so the details page can navigate between
         * Indicative No. 1, No. 2, No. 3, and later versions.
         */
        $versions =
            Ppmp::query()
                ->where(
                    'ppmp_series_id',
                    $ppmp
                        ->ppmp_series_id
                )
                ->orderByRaw(
                    "CASE WHEN plan_type = 'indicative' THEN 0 ELSE 1 END"
                )
                ->orderBy(
                    'indicative_no'
                )
                ->orderBy(
                    'id'
                )
                ->get([
                    'id',
                    'ppmp_series_id',
                    'ppmp_no',
                    'plan_type',
                    'indicative_no',
                    'status',
                    'total_budget',
                    'revised_from_ppmp_id',
                    'approved_at',
                    'created_at',
                ])
                ->map(
                    fn (
                        Ppmp $version
                    ) => [
                        'id' =>
                            $version->id,

                        'ppmp_no' =>
                            $version
                                ->ppmp_no,

                        'plan_type' =>
                            $version
                                ->plan_type,

                        'indicative_no' =>
                            $version
                                ->indicative_no,

                        'version_label' =>
                            $version
                                ->version_label,

                        'status' =>
                            $version
                                ->status,

                        'total_budget' =>
                            $version
                                ->total_budget,

                        'revised_from_ppmp_id' =>
                            $version
                                ->revised_from_ppmp_id,

                        'approved_at' =>
                            $version
                                ->approved_at
                                ?->format(
                                    'M d, Y h:i A'
                                ),

                        'created_at' =>
                            $version
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A'
                                ),

                        'is_current' =>
                            $version->id
                            === $ppmp->id,
                    ]
                )
                ->values();

        $hasLaterIndicative =
            $versions
                ->contains(
                    fn (
                        array $version
                    ) =>
                        $version[
                            'plan_type'
                        ] === 'indicative'
                        && (
                            (int) $version[
                                'indicative_no'
                            ]
                        ) > (
                            (int) $ppmp
                                ->indicative_no
                        )
                );

        return Inertia::render(
            'ppmps/show',
            [
                'ppmp' => [
                    'id' =>
                        $ppmp->id,

                    'ppmp_series_id' =>
                        $ppmp
                            ->ppmp_series_id,

                    'ppmp_no' =>
                        $ppmp->ppmp_no,

                    'fiscal_year' =>
                        $ppmp
                            ->fiscal_year,

                    'plan_type' =>
                        $ppmp
                            ->plan_type,

                    'indicative_no' =>
                        $ppmp
                            ->indicative_no,

                    'version_label' =>
                        $ppmp
                            ->version_label,

                    'status' =>
                        $ppmp->status,

                    'total_budget' =>
                        $ppmp
                            ->total_budget,

                    'original_budget' =>
                        $ppmp
                            ->series
                            ?->original_budget,

                    'series_approved_pr_total' =>
                        $ppmp
                            ->series
                            ?->approved_pr_total,

                    'revised_from' =>
                        $ppmp
                            ->revisedFrom
                            ? [
                                'id' =>
                                    $ppmp
                                        ->revisedFrom
                                        ->id,

                                'ppmp_no' =>
                                    $ppmp
                                        ->revisedFrom
                                        ->ppmp_no,

                                'indicative_no' =>
                                    $ppmp
                                        ->revisedFrom
                                        ->indicative_no,
                            ]
                            : null,

                    'versions' =>
                        $versions,

                    'prepared_by_name' =>
                        $ppmp
                            ->prepared_by_name,

                    'prepared_by_position' =>
                        $ppmp
                            ->prepared_by_position,

                    'submitted_by_name' =>
                        $ppmp
                            ->submitted_by_name,

                    'submitted_by_position' =>
                        $ppmp
                            ->submitted_by_position,

                    'office' =>
                        $ppmp->office,

                    'coordinator' =>
                        $ppmp
                            ->coordinator,

                    'items' =>
                        $ppmp
                            ->items
                            ->map(
                                fn (
                                    $item
                                ) => [
                                    'id' =>
                                        $item->id,

                                    'lineage_uuid' =>
                                        $item
                                            ->lineage_uuid,

                                    'description_objective' =>
                                        $item
                                            ->description_objective,

                                    'project_type' =>
                                        $item
                                            ->project_type,

                                    'quantity_size' =>
                                        $item
                                            ->quantity_size,

                                    'recommended_mode_of_procurement' =>
                                        $item
                                            ->recommended_mode_of_procurement,

                                    'pre_procurement_conference' =>
                                        $item
                                            ->pre_procurement_conference,

                                    'procurement_start_month' =>
                                        $item
                                            ->procurement_start_month,

                                    'procurement_end_month' =>
                                        $item
                                            ->procurement_end_month,

                                    'expected_delivery_month' =>
                                        $item
                                            ->expected_delivery_month,

                                    'source_of_funds' =>
                                        $item
                                            ->source_of_funds,

                                    'estimated_budget' =>
                                        $item
                                            ->estimated_budget,

                                    'remarks' =>
                                        $item
                                            ->remarks,

                                    'attachments' =>
                                        $item
                                            ->attachments
                                            ->map(
                                                fn (
                                                    $attachment
                                                ) => [
                                                    'id' =>
                                                        $attachment
                                                            ->id,

                                                    'original_name' =>
                                                        $attachment
                                                            ->original_name,

                                                    'file_size' =>
                                                        $attachment
                                                            ->file_size,
                                                ]
                                            ),
                                ]
                            ),

                    'histories' =>
                        $ppmp
                            ->statusHistories
                            ->map(
                                fn (
                                    $history
                                ) => [
                                    'id' =>
                                        $history
                                            ->id,

                                    'from_status' =>
                                        $history
                                            ->from_status,

                                    'to_status' =>
                                        $history
                                            ->to_status,

                                    'action' =>
                                        $history
                                            ->action,

                                    'remarks' =>
                                        $history
                                            ->remarks,

                                    'action_by' =>
                                        $history
                                            ->actionBy
                                            ?->name,

                                    'acted_at' =>
                                        $history
                                            ->acted_at
                                            ?->format(
                                                'M d, Y h:i A'
                                            ),
                                ]
                            ),

                    'remarks' =>
                        $ppmp->remarks,

                    'submitted_at' =>
                        $ppmp
                            ->submitted_at
                            ?->format(
                                'M d, Y h:i A'
                            ),

                    'returned_at' =>
                        $ppmp
                            ->returned_at
                            ?->format(
                                'M d, Y h:i A'
                            ),

                    'approved_at' =>
                        $ppmp
                            ->approved_at
                            ?->format(
                                'M d, Y h:i A'
                            ),

                    'approver' =>
                        $ppmp->approver
                            ? [
                                'id' =>
                                    $ppmp
                                        ->approver
                                        ->id,

                                'name' =>
                                    $ppmp
                                        ->approver
                                        ->name,
                            ]
                            : null,

                    'approved_copy' =>
                        $approvedCopy
                            ? [
                                'id' =>
                                    $approvedCopy
                                        ->id,

                                'original_name' =>
                                    $approvedCopy
                                        ->original_name,

                                'file_size' =>
                                    $approvedCopy
                                        ->file_size,
                            ]
                            : null,
                ],

                'can' => [
                    'edit' =>
                        $isCoordinatorOwner
                        && $user->can(
                            'ppmps.update-own'
                        )
                        && $ppmp
                            ->isEditable(),

                    'submit' =>
                        $isCoordinatorOwner
                        && $user->can(
                            'ppmps.submit'
                        )
                        && $ppmp->status
                            === 'draft',

                    'resubmit' =>
                        $isCoordinatorOwner
                        && $user->can(
                            'ppmps.resubmit'
                        )
                        && $ppmp->status
                            === 'returned_for_revision',

                    'return_for_revision' =>
                        $user->can(
                            'ppmps.return'
                        )
                        && $ppmp->status
                            === 'submitted',

                    'approve' =>
                        $user->can(
                            'ppmps.approve'
                        )
                        && $user->can(
                            'ppmps.upload-approved-copy'
                        )
                        && $ppmp->status
                            === 'submitted',

                    'create_pr' =>
                        $isCoordinatorOwner
                        && $ppmp->status
                            === 'approved',

                    'create_revision' =>
                        $isCoordinatorOwner
                        && $user->can(
                            'ppmps.create'
                        )
                        && $ppmp->plan_type
                            === 'indicative'
                        && $ppmp->status
                            === 'approved'
                        && ! $hasLaterIndicative,
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

    public function edit(
        Request $request,
        Ppmp $ppmp
    ): Response {
        $this->ensureCanEdit(
            $request,
            $ppmp
        );

        $ppmp->load([
            'series:id,office_id,fiscal_year,original_budget,approved_pr_total',

            'office:id,code,name',

            'coordinator:id,name,position_title',

            'items',
        ]);

        return Inertia::render(
            'ppmps/edit',
            [
                'ppmp' =>
                    $ppmp,
            ]
        );
    }

    public function update(
        UpdatePpmpRequest $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $validated =
            $request->validated();

        $ppmp->loadMissing(
            'series'
        );

        abort_if(
            $ppmp->series
                === null,
            500,
            'PPMP series information is missing.'
        );

        /*
         * Calculate the proposed total BEFORE any database
         * or physical-file changes are made.
         *
         * This is especially important because deleting an
         * omitted PPMP item also deletes its physical
         * attachment files, which a database rollback cannot
         * restore.
         */
        $proposedTotalCents = 0;

        foreach (
            $validated['items']
            as $itemData
        ) {
            if (
                ! $this
                    ->itemHasContent(
                        $itemData
                    )
            ) {
                continue;
            }

            $proposedTotalCents +=
                $this
                    ->moneyToCents(
                        $itemData[
                            'estimated_budget'
                        ]
                        ?? 0
                    );
        }

        /*
         * Indicative No. 2 and all succeeding Indicative
         * revisions must retain EXACTLY the permanent
         * Original PPMP Budget.
         *
         * Example:
         *
         * Original Budget = 100,000.00
         *
         * 100,000.00 = allowed
         *  95,000.00 = rejected
         * 105,000.00 = rejected
         */
        if (
            $ppmp->isIndicative()
            && ! $ppmp
                ->isFirstIndicative()
        ) {
            $originalBudgetCents =
                $this
                    ->moneyToCents(
                        $ppmp
                            ->series
                            ->original_budget
                    );

            if (
                $proposedTotalCents !==
                $originalBudgetCents
            ) {
                throw ValidationException::withMessages([
                    'items' =>
                        'The total budget of an Indicative revision must exactly match the Original PPMP Budget of ₱'
                        .number_format(
                            $originalBudgetCents / 100,
                            2
                        )
                        .'.',
                ]);
            }

            /*
             * Protect historical approved Purchase Request
             * utilization before any item or attachment is
             * changed or deleted.
             *
             * An inherited logical item may be reduced only
             * as far as its cumulative APPROVED PR usage.
             *
             * Deleting an inherited item is treated as a
             * proposed allocation of zero and is therefore
             * blocked when that lineage has approved PR use.
             */
            $this
                ->validateRevisionLineageUtilization(
                    ppmp:
                        $ppmp,

                    validatedItems:
                        $validated[
                            'items'
                        ]
                );
        }

        DB::transaction(
            function () use (
                $request,
                $validated,
                $ppmp
            ): void {
                /*
                 * Only Indicative No. 1 may change
                 * the series fiscal year while it is
                 * still editable.
                 *
                 * Future revisions will inherit the
                 * fiscal year of their PPMP series.
                 */
                $fiscalYear =
                    $ppmp
                        ->isFirstIndicative()
                        ? $validated[
                            'fiscal_year'
                        ]
                        : $ppmp
                            ->series
                            ->fiscal_year;

                /*
                 * plan_type is intentionally NOT
                 * updated here.
                 *
                 * The coordinator cannot convert
                 * Indicative into Final.
                 */
                $ppmp->update([
                    'fiscal_year' =>
                        $fiscalYear,

                    'prepared_by_name' =>
                        $validated[
                            'prepared_by_name'
                        ] ?: null,

                    'prepared_by_position' =>
                        $validated[
                            'prepared_by_position'
                        ] ?: null,

                    'submitted_by_name' =>
                        $validated[
                            'submitted_by_name'
                        ] ?: null,

                    'submitted_by_position' =>
                        $validated[
                            'submitted_by_position'
                        ] ?: null,

                    'updated_by' =>
                        $request
                            ->user()
                            ->id,
                ]);

                $savedItemIds = [];

                $totalCents = 0;

                foreach (
                    $validated['items']
                    as $index =>
                        $itemData
                ) {
                    if (
                        ! $this
                            ->itemHasContent(
                                $itemData
                            )
                    ) {
                        continue;
                    }

                    $amountCents =
                        $this
                            ->moneyToCents(
                                $itemData[
                                    'estimated_budget'
                                ]
                                ?? 0
                            );

                    $totalCents +=
                        $amountCents;

                    $item = null;

                    if (
                        ! empty(
                            $itemData[
                                'id'
                            ]
                        )
                    ) {
                        $item =
                            $ppmp
                                ->items()
                                ->findOrFail(
                                    $itemData[
                                        'id'
                                    ]
                                );
                    }

                    $values = [
                        'description_objective' =>
                            $itemData[
                                'description_objective'
                            ]
                            ?? '',

                        'project_type' =>
                            $itemData[
                                'project_type'
                            ]
                            ?? '',

                        'quantity_size' =>
                            $itemData[
                                'quantity_size'
                            ]
                            ?? '',

                        'recommended_mode_of_procurement' =>
                            $itemData[
                                'recommended_mode_of_procurement'
                            ]
                            ?? '',

                        'pre_procurement_conference' =>
                            (bool) (
                                $itemData[
                                    'pre_procurement_conference'
                                ]
                                ?? false
                            ),

                        'procurement_start_month' =>
                            $itemData[
                                'procurement_start_month'
                            ]
                            ?? '',

                        'procurement_end_month' =>
                            $itemData[
                                'procurement_end_month'
                            ]
                            ?? '',

                        'expected_delivery_month' =>
                            $itemData[
                                'expected_delivery_month'
                            ]
                            ?? '',

                        'source_of_funds' =>
                            $itemData[
                                'source_of_funds'
                            ]
                            ?? '',

                        'estimated_budget' =>
                            $this
                                ->centsToMoney(
                                    $amountCents
                                ),

                        'remarks' =>
                            $itemData[
                                'remarks'
                            ]
                            ?? null,

                        'sort_order' =>
                            $index + 1,
                    ];

                    if ($item) {
                        $item->update(
                            $values
                        );
                    } else {
                        /*
                         * PpmpItem::booted()
                         * automatically creates a
                         * lineage UUID for brand-new
                         * items.
                         */
                        $item =
                            $ppmp
                                ->items()
                                ->create(
                                    $values
                                );
                    }

                    $savedItemIds[] =
                        $item->id;
                }

                $itemsToDelete =
                    $ppmp
                        ->items()
                        ->whereNotIn(
                            'id',
                            $savedItemIds
                        )
                        ->with(
                            'attachments'
                        )
                        ->get();

                foreach (
                    $itemsToDelete
                    as $item
                ) {
                    foreach (
                        $item
                            ->attachments
                        as $attachment
                    ) {
                        Storage::disk(
                            'local'
                        )->delete(
                            $attachment
                                ->file_path
                        );
                    }

                    $item->delete();
                }

                $totalBudget =
                    $this
                        ->centsToMoney(
                            $totalCents
                        );

                $ppmp->update([
                    'total_budget' =>
                        $totalBudget,

                    'updated_by' =>
                        $request
                            ->user()
                            ->id,
                ]);

                /*
                 * Indicative No. 1 establishes the
                 * original budget.
                 *
                 * While No. 1 is still editable,
                 * its series original_budget follows
                 * its current total.
                 *
                 * Once No. 1 is approved it becomes
                 * immutable, therefore this amount
                 * becomes permanent.
                 */
                if (
                    $ppmp
                        ->isFirstIndicative()
                ) {
                    $ppmp
                        ->series
                        ->update([
                            'fiscal_year' =>
                                $fiscalYear,

                            'original_budget' =>
                                $totalBudget,

                            'updated_by' =>
                                $request
                                    ->user()
                                    ->id,
                        ]);
                }

                $this
                    ->auditLogService
                    ->record(
                        module:
                            'ppmp',

                        action:
                            'ppmp-updated',

                        subject:
                            $ppmp,

                        description:
                            "Updated {$ppmp->ppmp_no} - {$ppmp->version_label}.",

                        newValues: [
                            'fiscal_year' =>
                                $fiscalYear,

                            'plan_type' =>
                                $ppmp
                                    ->plan_type,

                            'indicative_no' =>
                                $ppmp
                                    ->indicative_no,

                            'total_budget' =>
                                $totalBudget,

                            'original_budget' =>
                                $ppmp
                                    ->series
                                    ->original_budget,

                            'items_count' =>
                                count(
                                    $savedItemIds
                                ),
                        ],

                        request:
                            $request
                    );
            }
        );

        return redirect()
            ->route(
                'ppmps.show',
                $ppmp
            )
            ->with(
                'success',
                "{$ppmp->version_label} was updated successfully."
            );
    }


    /**
     * Create the next Indicative revision from an
     * approved Indicative PPMP.
     *
     * The approved source PPMP remains untouched.
     */
    public function createRevision(
        Request $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $user = $request->user();

        /*
        * Only the PPMP Coordinator assigned to the
        * same office may create another Indicative
        * revision.
        */
        abort_unless(
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.create'
            )
            && $user->office_id
                === $ppmp->office_id,
            403
        );

        if (
            $ppmp->plan_type !==
            'indicative'
        ) {
            return back()->withErrors([
                'revision' =>
                    'Only an Indicative PPMP may be used to create another Indicative revision.',
            ]);
        }

        if (
            $ppmp->status !==
            'approved'
        ) {
            return back()->withErrors([
                'revision' =>
                    'A new Indicative revision may only be created from an approved Indicative PPMP.',
            ]);
        }

        if (
            $ppmp->ppmp_series_id ===
            null
        ) {
            return back()->withErrors([
                'revision' =>
                    'This PPMP is not connected to a PPMP series.',
            ]);
        }

        /*
        * Physical file copies are outside the database
        * transaction, so remember every copied path.
        *
        * If anything fails, these files will also be
        * removed.
        */
        $copiedPaths = [];

        try {
            $newPpmp = DB::transaction(
                function () use (
                    $request,
                    $user,
                    $ppmp,
                    &$copiedPaths
                ): Ppmp {
                    /*
                    * Lock the PPMP Series so two requests
                    * cannot create the same next Indicative
                    * number at the same time.
                    */
                    $series =
                        PpmpSeries::query()
                            ->whereKey(
                                $ppmp
                                    ->ppmp_series_id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    /*
                    * Reload and lock the source PPMP inside
                    * the transaction.
                    */
                    $source =
                        Ppmp::query()
                            ->with([
                                'items.attachments',
                                'attachments',
                            ])
                            ->whereKey(
                                $ppmp->id
                            )
                            ->lockForUpdate()
                            ->firstOrFail();

                    /*
                    * Recheck after acquiring the locks.
                    */
                    if (
                        $source->status !==
                        'approved'
                        || $source->plan_type !==
                        'indicative'
                    ) {
                        throw ValidationException::withMessages([
                            'revision' =>
                                'The selected PPMP is no longer eligible for a new Indicative revision.',
                        ]);
                    }

                    /*
                     * The approved source version must still
                     * be internally consistent with the
                     * permanent PPMP Series budget before
                     * another Indicative revision is created.
                     */
                    $sourceTotalCents =
                        $this
                            ->moneyToCents(
                                $source
                                    ->total_budget
                            );

                    $originalBudgetCents =
                        $this
                            ->moneyToCents(
                                $series
                                    ->original_budget
                            );

                    if (
                        $sourceTotalCents !==
                        $originalBudgetCents
                    ) {
                        throw ValidationException::withMessages([
                            'revision' =>
                                'The approved PPMP total does not match the permanent Original PPMP Budget. Please have the PPMP record reviewed before creating another Indicative revision.',
                        ]);
                    }

                    /*
                     * Defense-in-depth:
                     *
                     * Before cloning an approved source version,
                     * verify that every logical item lineage still
                     * has enough allocation to cover all historical
                     * APPROVED Purchase Requests.
                     */
                    $this
                        ->validateApprovedSourceLineageUtilization(
                            $source
                        );

                    /*
                    * Only the latest Indicative version
                    * may generate the next revision.
                    *
                    * Example:
                    *
                    * No. 1 approved
                    * No. 2 already exists
                    *
                    * No. 1 can no longer create another
                    * No. 2.
                    */
                    $latestIndicative =
                        Ppmp::query()
                            ->where(
                                'ppmp_series_id',
                                $series->id
                            )
                            ->where(
                                'plan_type',
                                'indicative'
                            )
                            ->orderByDesc(
                                'indicative_no'
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        $latestIndicative ===
                        null
                        || $latestIndicative->id
                            !== $source->id
                    ) {
                        throw ValidationException::withMessages([
                            'revision' =>
                                'A newer Indicative version already exists for this PPMP series. Open the latest version instead.',
                        ]);
                    }

                    $nextIndicativeNo =
                        ((int)
                            $source
                                ->indicative_no)
                        + 1;

                    /*
                    * Create the new PPMP version.
                    *
                    * The permanent original budget stays
                    * in ppmp_series.original_budget.
                    *
                    * New revision begins with exactly the
                    * source allocation.
                    */
                    $newPpmp =
                        Ppmp::create([
                            'ppmp_series_id' =>
                                $series->id,

                            'indicative_no' =>
                                $nextIndicativeNo,

                            'revised_from_ppmp_id' =>
                                $source->id,

                            'ppmp_no' =>
                                'TEMP-'
                                .Str::uuid(),

                            'fiscal_year' =>
                                $series
                                    ->fiscal_year,

                            'plan_type' =>
                                'indicative',

                            'office_id' =>
                                $source
                                    ->office_id,

                            /*
                            * Use the currently authorized
                            * PPMP Coordinator.
                            */
                            'coordinator_id' =>
                                $user->id,

                            /*
                            * Clone the signatory information
                            * from the approved version.
                            */
                            'prepared_by_name' =>
                                $source
                                    ->prepared_by_name,

                            'prepared_by_position' =>
                                $source
                                    ->prepared_by_position,

                            'submitted_by_name' =>
                                $source
                                    ->submitted_by_name,

                            'submitted_by_position' =>
                                $source
                                    ->submitted_by_position,

                            'status' =>
                                'draft',

                            /*
                            * Start with the exact same total
                            * as the approved source version.
                            *
                            * When edited later, the revision
                            * must still equal the permanent
                            * original budget.
                            */
                            'total_budget' =>
                                $source
                                    ->total_budget,

                            /*
                            * This field represents PR use
                            * directly associated with this
                            * particular PPMP version.
                            *
                            * Historical utilization from
                            * previous versions is not copied.
                            */
                            'approved_pr_total' =>
                                '0.00',

                            'submitted_at' =>
                                null,

                            'returned_at' =>
                                null,

                            'approved_at' =>
                                null,

                            'approved_by' =>
                                null,

                            'remarks' =>
                                null,

                            'created_by' =>
                                $user->id,

                            'updated_by' =>
                                $user->id,
                        ]);

                    /*
                    * Generate the normal system PPMP number.
                    */
                    $newPpmp
                        ->forceFill([
                            'ppmp_no' =>
                                sprintf(
                                    'PPMP-%d-%04d',
                                    $newPpmp
                                        ->fiscal_year,
                                    $newPpmp->id
                                ),
                        ])
                        ->save();

                    /*
                    * Map source PPMP item IDs to the newly
                    * cloned PPMP item IDs.
                    *
                    * This is needed when cloning supporting
                    * documents.
                    */
                    $itemIdMap = [];

                    foreach (
                        $source->items
                        as $sourceItem
                    ) {
                        /*
                        * Existing migrated records should
                        * already contain lineage_uuid.
                        *
                        * Keep this fallback for safety.
                        */
                        $lineageUuid =
                            $sourceItem
                                ->lineage_uuid;

                        if (
                            blank(
                                $lineageUuid
                            )
                        ) {
                            $lineageUuid =
                                (string)
                                Str::uuid();

                            $sourceItem
                                ->forceFill([
                                    'lineage_uuid' =>
                                        $lineageUuid,
                                ])
                                ->save();
                        }

                        $newItem =
                            $newPpmp
                                ->items()
                                ->create([
                                    /*
                                    * Same logical item across
                                    * Indicative revisions.
                                    */
                                    'lineage_uuid' =>
                                        $lineageUuid,

                                    /*
                                    * Exact previous-version
                                    * item from which this row
                                    * originated.
                                    */
                                    'source_item_id' =>
                                        $sourceItem
                                            ->id,

                                    'description_objective' =>
                                        $sourceItem
                                            ->description_objective,

                                    'project_type' =>
                                        $sourceItem
                                            ->project_type,

                                    'quantity_size' =>
                                        $sourceItem
                                            ->quantity_size,

                                    'recommended_mode_of_procurement' =>
                                        $sourceItem
                                            ->recommended_mode_of_procurement,

                                    'pre_procurement_conference' =>
                                        $sourceItem
                                            ->pre_procurement_conference,

                                    'procurement_start_month' =>
                                        $sourceItem
                                            ->procurement_start_month,

                                    'procurement_end_month' =>
                                        $sourceItem
                                            ->procurement_end_month,

                                    'expected_delivery_month' =>
                                        $sourceItem
                                            ->expected_delivery_month,

                                    'source_of_funds' =>
                                        $sourceItem
                                            ->source_of_funds,

                                    'estimated_budget' =>
                                        $sourceItem
                                            ->estimated_budget,

                                    /*
                                    * Do NOT copy historical
                                    * approved PR utilization.
                                    *
                                    * Approved PR history remains
                                    * connected to its original
                                    * PPMP item records.
                                    */
                                    'approved_pr_amount' =>
                                        '0.00',

                                    'remarks' =>
                                        $sourceItem
                                            ->remarks,

                                    'sort_order' =>
                                        $sourceItem
                                            ->sort_order,
                                ]);

                        $itemIdMap[
                            $sourceItem->id
                        ] =
                            $newItem->id;

                        /*
                        * Clone only supporting documents
                        * belonging to this procurement item.
                        *
                        * The physical file itself is copied,
                        * not shared between versions.
                        */
                        foreach (
                            $sourceItem
                                ->attachments
                                ->where(
                                    'document_type',
                                    'supporting_document'
                                )
                            as $attachment
                        ) {
                            $this
                                ->cloneRevisionAttachment(
                                    attachment:
                                        $attachment,

                                    newPpmp:
                                        $newPpmp,

                                    newItemId:
                                        $newItem->id,

                                    uploadedBy:
                                        $user->id,

                                    copiedPaths:
                                        $copiedPaths
                                );
                        }
                    }

                    /*
                    * Clone PPMP-level supporting documents
                    * if any exist.
                    *
                    * Do not clone item attachments again.
                    * Do not clone approved_ppmp.
                    */
                    foreach (
                        $source
                            ->attachments
                            ->whereNull(
                                'ppmp_item_id'
                            )
                            ->where(
                                'document_type',
                                'supporting_document'
                            )
                        as $attachment
                    ) {
                        $this
                            ->cloneRevisionAttachment(
                                attachment:
                                    $attachment,

                                newPpmp:
                                    $newPpmp,

                                newItemId:
                                    null,

                                uploadedBy:
                                    $user->id,

                                copiedPaths:
                                    $copiedPaths
                            );
                    }

                    /*
                    * Record initial history for the new
                    * Indicative revision.
                    */
                    $newPpmp
                        ->statusHistories()
                        ->create([
                            'from_status' =>
                                null,

                            'to_status' =>
                                'draft',

                            'action' =>
                                'create_revision',

                            'remarks' =>
                                "Indicative No. {$nextIndicativeNo} created from approved Indicative No. {$source->indicative_no}.",

                            'action_by' =>
                                $user->id,

                            'acted_at' =>
                                now(),
                        ]);

                    /*
                    * This does not change the permanent
                    * original budget.
                    */
                    $series->update([
                        'updated_by' =>
                            $user->id,
                    ]);

                    $this
                        ->auditLogService
                        ->record(
                            module:
                                'ppmp',

                            action:
                                'ppmp-revision-created',

                            subject:
                                $newPpmp,

                            description:
                                "{$newPpmp->ppmp_no} - Indicative No. {$nextIndicativeNo} was created from {$source->ppmp_no} - Indicative No. {$source->indicative_no}.",

                            newValues: [
                                'ppmp_series_id' =>
                                    $series->id,

                                'ppmp_no' =>
                                    $newPpmp
                                        ->ppmp_no,

                                'indicative_no' =>
                                    $nextIndicativeNo,

                                'revised_from_ppmp_id' =>
                                    $source->id,

                                'plan_type' =>
                                    'indicative',

                                'status' =>
                                    'draft',

                                'total_budget' =>
                                    $newPpmp
                                        ->total_budget,

                                'original_budget' =>
                                    $series
                                        ->original_budget,

                                'items_count' =>
                                    count(
                                        $itemIdMap
                                    ),
                            ],

                            request:
                                $request
                        );

                    return $newPpmp;
                }
            );
        } catch (Throwable $exception) {
            /*
            * Database changes roll back automatically.
            * Physical files must be cleaned up manually.
            */
            foreach (
                $copiedPaths
                as $copiedPath
            ) {
                Storage::disk(
                    'local'
                )->delete(
                    $copiedPath
                );
            }

            throw $exception;
        }

        return redirect()
            ->route(
                'ppmps.edit',
                $newPpmp
            )
            ->with(
                'success',
                "{$newPpmp->ppmp_no} - Indicative No. {$newPpmp->indicative_no} was created successfully. Review the revision and save any required changes."
            );
    }


    /**
    * Physically copy a supporting document into
    * another PPMP revision.
    *
    * The source and destination PPMPs never share
    * the same physical file path.
    *
    * @param array<int, string> $copiedPaths
    */
    private function cloneRevisionAttachment(
        $attachment,
        Ppmp $newPpmp,
        ?int $newItemId,
        int $uploadedBy,
        array &$copiedPaths
    ): void {
        $disk =
            Storage::disk(
                'local'
            );

        /*
         * A missing historical file should not result in
         * a silently incomplete PPMP revision.
         */
        if (
            ! $disk->exists(
                $attachment
                    ->file_path
            )
        ) {
            throw ValidationException::withMessages([
                'revision' =>
                    "Supporting document \"{$attachment->original_name}\" could not be copied because its stored file is missing.",
            ]);
        }

        $extension =
            pathinfo(
                $attachment
                    ->stored_name
                    ?: $attachment
                        ->file_path,
                PATHINFO_EXTENSION
            );

        $newStoredName =
            (string)
            Str::uuid();

        if (
            $extension !== ''
        ) {
            $newStoredName .=
                '.'
                .$extension;
        }

        /*
         * Item documents retain the existing storage
         * structure used by PpmpAttachmentController.
         */
        if (
            $newItemId !==
            null
        ) {
            $directory =
                "ppmps/{$newPpmp->id}/items/{$newItemId}";
        } else {
            /*
             * Reserved location for PPMP-level supporting
             * documents.
             */
            $directory =
                "ppmps/{$newPpmp->id}/supporting";
        }

        $disk->makeDirectory(
            $directory
        );

        $newPath =
            "{$directory}/{$newStoredName}";

        $copied =
            $disk->copy(
                $attachment
                    ->file_path,
                $newPath
            );

        if (! $copied) {
            throw ValidationException::withMessages([
                'revision' =>
                    "Supporting document \"{$attachment->original_name}\" could not be copied to the new Indicative revision.",
            ]);
        }

        $copiedPaths[] =
            $newPath;

        /*
         * Create a completely independent database record.
         */
        $newPpmp
            ->attachments()
            ->create([
                'ppmp_item_id' =>
                    $newItemId,

                'document_type' =>
                    'supporting_document',

                'original_name' =>
                    $attachment
                        ->original_name,

                'stored_name' =>
                    $newStoredName,

                'file_path' =>
                    $newPath,

                'mime_type' =>
                    $attachment
                        ->mime_type,

                'file_size' =>
                    $attachment
                        ->file_size,

                'uploaded_by' =>
                    $uploadedBy,
            ]);
    }


    /**
     * Validate proposed allocations in an editable
     * Indicative revision against cumulative historical
     * APPROVED Purchase Request utilization.
     *
     * Historical utilization follows lineage_uuid across
     * every PPMP version. It does not rely on the copied
     * approved_pr_amount field of the current revision.
     *
     * @param array<int, array<string, mixed>> $validatedItems
     */
    private function validateRevisionLineageUtilization(
        Ppmp $ppmp,
        array $validatedItems
    ): void {
        $currentItems =
            $ppmp
                ->items()
                ->get([
                    'id',
                    'ppmp_id',
                    'lineage_uuid',
                    'description_objective',
                    'estimated_budget',
                ]);

        /*
         * Every current item in a versioned PPMP must have
         * a lineage UUID. The versioning migration and the
         * PpmpItem model should guarantee this.
         */
        $itemsWithMissingLineage =
            $currentItems
                ->filter(
                    fn ($item) =>
                        blank(
                            $item
                                ->lineage_uuid
                        )
                );

        if (
            $itemsWithMissingLineage
                ->isNotEmpty()
        ) {
            throw ValidationException::withMessages([
                'items' =>
                    'One or more PPMP items are missing lineage tracking information. Please have the PPMP record reviewed before saving this revision.',
            ]);
        }

        $itemsById =
            $currentItems
                ->keyBy(
                    'id'
                );

        /*
         * All current inherited lineages are included here,
         * including items omitted from the submitted form.
         *
         * Omitted items will therefore have a proposed
         * allocation of zero.
         */
        $lineageUuids =
            $currentItems
                ->pluck(
                    'lineage_uuid'
                )
                ->filter()
                ->unique()
                ->values()
                ->all();

        if (
            $lineageUuids === []
        ) {
            return;
        }

        $proposedByLineage =
            [];

        $submittedIndexByLineage =
            [];

        $labelByLineage =
            [];

        foreach (
            $currentItems
            as $currentItem
        ) {
            $lineageUuid =
                (string)
                $currentItem
                    ->lineage_uuid;

            $proposedByLineage[
                $lineageUuid
            ] = 0;

            $labelByLineage[
                $lineageUuid
            ] =
                trim(
                    (string)
                    $currentItem
                        ->description_objective
                ) !== ''
                    ? (string)
                        $currentItem
                            ->description_objective
                    : "PPMP Item #{$currentItem->id}";
        }

        foreach (
            $validatedItems
            as $index =>
                $itemData
        ) {
            if (
                ! $this
                    ->itemHasContent(
                        $itemData
                    )
            ) {
                continue;
            }

            /*
             * Brand-new items have no historical lineage
             * utilization yet, so there is nothing to
             * validate against approved PR history.
             */
            if (
                empty(
                    $itemData[
                        'id'
                    ]
                )
            ) {
                continue;
            }

            $itemId =
                (int)
                $itemData[
                    'id'
                ];

            $currentItem =
                $itemsById
                    ->get(
                        $itemId
                    );

            /*
             * UpdatePpmpRequest already verifies that the
             * ID belongs to this PPMP. Keep this defensive
             * guard in case validation rules change later.
             */
            if (
                $currentItem ===
                null
            ) {
                throw ValidationException::withMessages([
                    "items.{$index}.id" =>
                        'The selected PPMP item does not belong to this PPMP revision.',
                ]);
            }

            $lineageUuid =
                (string)
                $currentItem
                    ->lineage_uuid;

            $amountCents =
                $this
                    ->moneyToCents(
                        $itemData[
                            'estimated_budget'
                        ]
                        ?? 0
                    );

            /*
             * A PPMP version should normally contain one row
             * per lineage. Summing makes the protection safe
             * even if legacy data contains duplicates.
             */
            $proposedByLineage[
                $lineageUuid
            ] =
                (
                    $proposedByLineage[
                        $lineageUuid
                    ]
                    ?? 0
                )
                + $amountCents;

            $submittedIndexByLineage[
                $lineageUuid
            ] =
                $index;

            if (
                trim(
                    (string) (
                        $itemData[
                            'description_objective'
                        ]
                        ?? ''
                    )
                ) !== ''
            ) {
                $labelByLineage[
                    $lineageUuid
                ] =
                    (string)
                    $itemData[
                        'description_objective'
                    ];
            }
        }

        $approvedUtilization =
            $this
                ->approvedPrUtilizationByLineage(
                    $lineageUuids
                );

        foreach (
            $lineageUuids
            as $lineageUuid
        ) {
            $utilizedCents =
                $approvedUtilization[
                    $lineageUuid
                ]
                ?? 0;

            if (
                $utilizedCents <=
                0
            ) {
                continue;
            }

            $proposedCents =
                $proposedByLineage[
                    $lineageUuid
                ]
                ?? 0;

            if (
                $proposedCents >=
                $utilizedCents
            ) {
                continue;
            }

            $itemLabel =
                $labelByLineage[
                    $lineageUuid
                ]
                ?? 'This procurement item';

            $message =
                "\"{$itemLabel}\" cannot be allocated below its historical approved PR utilization of ₱"
                .number_format(
                    $utilizedCents / 100,
                    2
                )
                .'. The proposed allocation is ₱'
                .number_format(
                    $proposedCents / 100,
                    2
                )
                .'.';

            /*
             * If the item is still present in the submitted
             * form, attach the error directly to its budget
             * field so the React editor opens that item.
             *
             * If it was deleted/omitted, return a general
             * items error because its proposed allocation is
             * effectively zero.
             */
            if (
                array_key_exists(
                    $lineageUuid,
                    $submittedIndexByLineage
                )
            ) {
                $index =
                    $submittedIndexByLineage[
                        $lineageUuid
                    ];

                throw ValidationException::withMessages([
                    "items.{$index}.estimated_budget" =>
                        $message,
                ]);
            }

            throw ValidationException::withMessages([
                'items' =>
                    $message
                    .' You cannot remove this item because it already has approved PR utilization.',
            ]);
        }
    }

    /**
     * Validate an approved source PPMP before it is cloned
     * into another Indicative revision.
     */
    private function validateApprovedSourceLineageUtilization(
        Ppmp $ppmp
    ): void {
        $ppmp->loadMissing(
            'items'
        );

        $lineageUuids =
            $ppmp
                ->items
                ->pluck(
                    'lineage_uuid'
                )
                ->filter()
                ->unique()
                ->values()
                ->all();

        if (
            $lineageUuids === []
        ) {
            return;
        }

        if (
            $ppmp
                ->items
                ->contains(
                    fn ($item) =>
                        blank(
                            $item
                                ->lineage_uuid
                        )
                )
        ) {
            throw ValidationException::withMessages([
                'revision' =>
                    'One or more source PPMP items are missing lineage tracking information. Please have the PPMP record reviewed before creating another Indicative revision.',
            ]);
        }

        $allocationByLineage =
            [];

        $labelByLineage =
            [];

        foreach (
            $ppmp->items
            as $item
        ) {
            $lineageUuid =
                (string)
                $item
                    ->lineage_uuid;

            $allocationByLineage[
                $lineageUuid
            ] =
                (
                    $allocationByLineage[
                        $lineageUuid
                    ]
                    ?? 0
                )
                + $this
                    ->moneyToCents(
                        $item
                            ->estimated_budget
                    );

            $labelByLineage[
                $lineageUuid
            ] =
                trim(
                    (string)
                    $item
                        ->description_objective
                ) !== ''
                    ? (string)
                        $item
                            ->description_objective
                    : "PPMP Item #{$item->id}";
        }

        $approvedUtilization =
            $this
                ->approvedPrUtilizationByLineage(
                    $lineageUuids
                );

        foreach (
            $approvedUtilization
            as $lineageUuid =>
                $utilizedCents
        ) {
            $allocationCents =
                $allocationByLineage[
                    $lineageUuid
                ]
                ?? 0;

            if (
                $allocationCents >=
                $utilizedCents
            ) {
                continue;
            }

            $itemLabel =
                $labelByLineage[
                    $lineageUuid
                ]
                ?? 'A procurement item';

            throw ValidationException::withMessages([
                'revision' =>
                    "\"{$itemLabel}\" has an allocation of ₱"
                    .number_format(
                        $allocationCents / 100,
                        2
                    )
                    .' but its cumulative historical approved PR utilization is ₱'
                    .number_format(
                        $utilizedCents / 100,
                        2
                    )
                    .'. The PPMP record must be reviewed before creating another Indicative revision.',
            ]);
        }
    }

    /**
     * Return cumulative APPROVED Purchase Request
     * utilization keyed by PPMP item lineage UUID.
     *
     * The query intentionally follows:
     *
     * purchase_request_items.ppmp_item_id
     *     -> ppmp_items.lineage_uuid
     *
     * and includes only purchase_requests whose status is
     * approved and which have not been soft-deleted.
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

        $result =
            [];

        foreach (
            $rows
            as $row
        ) {
            $lineageUuid =
                (string)
                $row
                    ->lineage_uuid;

            if (
                $lineageUuid ===
                ''
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
     * Convert a validated monetary value into cents.
     *
     * This avoids using floating-point math for
     * PPMP budget calculations.
     */
    private function moneyToCents(
        mixed $value
    ): int {
        $amount =
            trim(
                str_replace(
                    ',',
                    '',
                    (string) (
                        $value
                        ?? '0'
                    )
                )
            );

        if ($amount === '') {
            return 0;
        }

        $parts =
            explode(
                '.',
                $amount,
                2
            );

        $whole =
            preg_replace(
                '/\D/',
                '',
                $parts[0]
                    ?? '0'
            );

        $decimal =
            preg_replace(
                '/\D/',
                '',
                $parts[1]
                    ?? ''
            );

        $decimal =
            str_pad(
                substr(
                    $decimal,
                    0,
                    2
                ),
                2,
                '0'
            );

        return (
            ((int) (
                $whole
                !== ''
                    ? $whole
                    : '0'
            )) * 100
        ) + (int) $decimal;
    }

    /**
     * Convert cents into a DECIMAL(15,2)
     * compatible string.
     */
    private function centsToMoney(
        int $cents
    ): string {
        return sprintf(
            '%d.%02d',
            intdiv(
                $cents,
                100
            ),
            $cents % 100
        );
    }

    private function ensureCanView(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user =
            $request->user();

        $allowed =
            $user->can(
                'ppmps.view-all'
            )
            || (
                $user->can(
                    'ppmps.view-own'
                )
                && $user
                    ->office_id
                    === $ppmp
                        ->office_id
            );

        abort_unless(
            $allowed,
            403
        );
    }

    private function ensureCanEdit(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user =
            $request->user();

        $allowed =
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.update-own'
            )
            && $user
                ->office_id
                === $ppmp
                    ->office_id
            && $ppmp
                ->isEditable();

        abort_unless(
            $allowed,
            403,
            'This PPMP cannot be edited.'
        );
    }
}
