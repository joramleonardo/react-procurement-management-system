<?php

namespace App\Http\Controllers;

use App\Http\Requests\Ppmp\StorePpmpRequest;
use App\Models\Ppmp;
use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Ppmp\UpdatePpmpRequest;
use Illuminate\Support\Facades\Storage;

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
            (string) ($validated['search'] ?? '')
        );

        $fiscalYear = $validated['fiscal_year'] ?? null;
        $status = (string) ($validated['status'] ?? '');
        $planType = (string) ($validated['plan_type'] ?? '');

        /*
         * GSPS Administrator / System Administrator:
         * See all PPMPs.
         *
         * PPMP Coordinator:
         * See only their division's PPMPs.
         */
        $query = Ppmp::query()
            ->with([
                'office:id,code,name',
                'coordinator:id,name',
            ])
            ->withCount('items');

        if (! $user->can('ppmps.view-all')) {
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
                function (Builder $query) use ($search): void {
                    $query->where(
                        function (Builder $searchQuery) use ($search): void {
                            $searchQuery
                                ->where(
                                    'ppmp_no',
                                    'like',
                                    "%{$search}%"
                                )
                                ->orWhereHas(
                                    'office',
                                    function (Builder $officeQuery) use ($search): void {
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
                                    function (Builder $userQuery) use ($search): void {
                                        $userQuery->where(
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
                fn (Builder $query) =>
                    $query->where(
                        'fiscal_year',
                        $fiscalYear
                    )
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
                $planType !== '',
                fn (Builder $query) =>
                    $query->where(
                        'plan_type',
                        $planType
                    )
            );

        $ppmps = $query
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Ppmp $ppmp) => [
                'id' => $ppmp->id,
                'ppmp_no' => $ppmp->ppmp_no,
                'fiscal_year' => $ppmp->fiscal_year,
                'plan_type' => $ppmp->plan_type,
                'status' => $ppmp->status,
                'total_budget' => $ppmp->total_budget,
                'items_count' => $ppmp->items_count,

                'office' => [
                    'id' => $ppmp->office->id,
                    'code' => $ppmp->office->code,
                    'name' => $ppmp->office->name,
                ],

                'coordinator' => [
                    'id' => $ppmp->coordinator->id,
                    'name' => $ppmp->coordinator->name,
                ],

                'updated_at' => $ppmp->updated_at
                    ?->format('M d, Y h:i A'),
            ]);

        /*
         * Build fiscal year filter options.
         */
        $yearsQuery = Ppmp::query()
            ->select('fiscal_year')
            ->distinct();

        if (! $user->can('ppmps.view-all')) {
            $yearsQuery->where(
                'office_id',
                $user->office_id
            );
        }

        $fiscalYears = $yearsQuery
            ->orderByDesc('fiscal_year')
            ->pluck('fiscal_year')
            ->values();

        return Inertia::render('ppmps/index', [
            'ppmps' => $ppmps,

            'filters' => [
                'search' => $search,
                'fiscal_year' => $fiscalYear
                    ? (string) $fiscalYear
                    : '',
                'status' => $status,
                'plan_type' => $planType,
            ],

            'fiscalYears' => $fiscalYears,

            'can' => [
                'create' =>
                    $user->hasRole('ppmp-coordinator')
                    && $user->can('ppmps.create')
                    && $user->office_id !== null,
            ],

            'flash' => [
                'success' => $request
                    ->session()
                    ->get('success'),
            ],
        ]);
    }

    /**
     * Display the Create PPMP page.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();

        abort_unless(
            $user->hasRole('ppmp-coordinator')
            && $user->can('ppmps.create'),
            403,
            'Only PPMP Coordinators may create a PPMP.'
        );

        abort_if(
            $user->office_id === null,
            403,
            'Your account must be assigned to an office before creating a PPMP.'
        );

        $user->loadMissing(
            'office:id,code,name'
        );

        return Inertia::render('ppmps/create', [
            'office' => [
                'id' => $user->office->id,
                'code' => $user->office->code,
                'name' => $user->office->name,
            ],

            'coordinator' => [
                'id' => $user->id,
                'name' => $user->name,
                'position_title' =>
                    $user->position_title,
            ],

            'currentFiscalYear' =>
                now()->year,
        ]);
    }

    /**
     * Save a new PPMP as Draft.
     */
    public function store(
        StorePpmpRequest $request
    ): RedirectResponse {
        $validated = $request->validated();

        $user = $request->user();

        $ppmp = DB::transaction(
            function () use (
                $validated,
                $user,
                $request
            ): Ppmp {
                /*
                 * Temporary unique number.
                 *
                 * Once the record gets an ID we replace this
                 * with a readable PPMP number.
                 */
                $ppmp = Ppmp::create([
                    'ppmp_no' =>
                        'TEMP-'.Str::uuid(),

                    'fiscal_year' =>
                        $validated['fiscal_year'],

                    'plan_type' =>
                        $validated['plan_type'],

                    /*
                     * Never trust an office from the browser.
                     * The PPMP belongs to the logged-in
                     * coordinator's division.
                     */
                    'office_id' =>
                        $user->office_id,

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

                    'status' => 'draft',

                    'total_budget' => 0,

                    'approved_pr_total' => 0,

                    'created_by' =>
                        $user->id,

                    'updated_by' =>
                        $user->id,
                ]);

                /*
                 * Example:
                 * PPMP-2026-0007
                 */
                $ppmp->forceFill([
                    'ppmp_no' => sprintf(
                        'PPMP-%d-%04d',
                        $ppmp->fiscal_year,
                        $ppmp->id
                    ),
                ])->save();

                $totalCents = 0;

                foreach (
                    $validated['items']
                    as $index => $item
                ) {
                    /*
                     * Ignore completely blank rows.
                     */
                    if (
                        ! $this->itemHasContent($item)
                    ) {
                        continue;
                    }

                    $budget = (float) (
                        $item['estimated_budget']
                        ?? 0
                    );

                    $budgetCents = (int) round(
                        $budget * 100
                    );

                    $totalCents += $budgetCents;

                    $ppmp->items()->create([
                        'description_objective' =>
                            $item[
                                'description_objective'
                            ] ?? '',

                        'project_type' =>
                            $item[
                                'project_type'
                            ] ?? '',

                        'quantity_size' =>
                            $item[
                                'quantity_size'
                            ] ?? '',

                        'recommended_mode_of_procurement' =>
                            $item[
                                'recommended_mode_of_procurement'
                            ] ?? '',

                        'pre_procurement_conference' =>
                            (bool) (
                                $item[
                                    'pre_procurement_conference'
                                ] ?? false
                            ),

                        'procurement_start_month' =>
                            $item[
                                'procurement_start_month'
                            ] ?? '',

                        'procurement_end_month' =>
                            $item[
                                'procurement_end_month'
                            ] ?? '',

                        'expected_delivery_month' =>
                            $item[
                                'expected_delivery_month'
                            ] ?? '',

                        'source_of_funds' =>
                            $item[
                                'source_of_funds'
                            ] ?? '',

                        'estimated_budget' =>
                            number_format(
                                $budgetCents / 100,
                                2,
                                '.',
                                ''
                            ),

                        'approved_pr_amount' => 0,

                        'remarks' =>
                            $item['remarks']
                            ?? null,

                        'sort_order' =>
                            $index + 1,
                    ]);
                }

                $totalBudget = number_format(
                    $totalCents / 100,
                    2,
                    '.',
                    ''
                );

                $ppmp->forceFill([
                    'total_budget' =>
                        $totalBudget,
                ])->save();

                /*
                 * PPMP business workflow history.
                 */
                $ppmp->statusHistories()->create([
                    'from_status' => null,
                    'to_status' => 'draft',
                    'action' => 'create',
                    'remarks' =>
                        'PPMP created and saved as draft.',
                    'action_by' => $user->id,
                    'acted_at' => now(),
                ]);

                /*
                 * System audit trail.
                 */
                $this->auditLogService->record(
                    module: 'ppmp',
                    action: 'ppmp-created',
                    subject: $ppmp,

                    description:
                        "Created {$ppmp->ppmp_no} as draft.",

                    newValues: [
                        'ppmp_no' =>
                            $ppmp->ppmp_no,

                        'fiscal_year' =>
                            $ppmp->fiscal_year,

                        'plan_type' =>
                            $ppmp->plan_type,

                        'office_id' =>
                            $ppmp->office_id,

                        'status' =>
                            $ppmp->status,

                        'total_budget' =>
                            $totalBudget,
                    ],

                    request: $request
                );

                return $ppmp;
            }
        );

        return redirect()
            ->route('ppmps.index')
            ->with(
                'success',
                "{$ppmp->ppmp_no} was saved as draft."
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

        foreach ($fields as $field) {
            $value = $item[$field] ?? null;

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
            'office:id,code,name',
            'coordinator:id,name,position_title',
            'items.attachments',
            'statusHistories.actionBy:id,name',
        ]);

        return Inertia::render('ppmps/show', [
            'ppmp' => [
                'id' => $ppmp->id,
                'ppmp_no' => $ppmp->ppmp_no,
                'fiscal_year' => $ppmp->fiscal_year,
                'plan_type' => $ppmp->plan_type,
                'status' => $ppmp->status,
                'total_budget' => $ppmp->total_budget,

                'prepared_by_name' =>
                    $ppmp->prepared_by_name,

                'prepared_by_position' =>
                    $ppmp->prepared_by_position,

                'submitted_by_name' =>
                    $ppmp->submitted_by_name,

                'submitted_by_position' =>
                    $ppmp->submitted_by_position,

                'office' => $ppmp->office,

                'coordinator' =>
                    $ppmp->coordinator,

                'items' => $ppmp->items
                    ->map(fn ($item) => [
                        'id' => $item->id,

                        'description_objective' =>
                            $item->description_objective,

                        'project_type' =>
                            $item->project_type,

                        'quantity_size' =>
                            $item->quantity_size,

                        'recommended_mode_of_procurement' =>
                            $item->recommended_mode_of_procurement,

                        'pre_procurement_conference' =>
                            $item->pre_procurement_conference,

                        'procurement_start_month' =>
                            $item->procurement_start_month,

                        'procurement_end_month' =>
                            $item->procurement_end_month,

                        'expected_delivery_month' =>
                            $item->expected_delivery_month,

                        'source_of_funds' =>
                            $item->source_of_funds,

                        'estimated_budget' =>
                            $item->estimated_budget,

                        'remarks' =>
                            $item->remarks,

                        'attachments' =>
                            $item->attachments
                                ->map(fn ($attachment) => [
                                    'id' =>
                                        $attachment->id,

                                    'original_name' =>
                                        $attachment
                                            ->original_name,

                                    'file_size' =>
                                        $attachment
                                            ->file_size,
                                ]),
                    ]),

                'histories' =>
                    $ppmp->statusHistories
                        ->map(fn ($history) => [
                            'id' => $history->id,
                            'from_status' =>
                                $history->from_status,
                            'to_status' =>
                                $history->to_status,
                            'action' =>
                                $history->action,
                            'remarks' =>
                                $history->remarks,
                            'action_by' =>
                                $history->actionBy?->name,
                            'acted_at' =>
                                $history->acted_at
                                    ?->format(
                                        'M d, Y h:i A'
                                    ),
                        ]),
            ],

            'can' => [
                'edit' =>
                    $request->user()
                        ->hasRole(
                            'ppmp-coordinator'
                        )
                    && $request->user()
                        ->office_id
                        === $ppmp->office_id
                    && $ppmp->isEditable(),
            ],

            'flash' => [
                'success' =>
                    $request->session()
                        ->get('success'),
            ],
        ]);
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
            'office:id,code,name',
            'coordinator:id,name,position_title',
            'items',
        ]);

        return Inertia::render(
            'ppmps/edit',
            [
                'ppmp' => $ppmp,
            ]
        );
    }

    public function update(
        UpdatePpmpRequest $request,
        Ppmp $ppmp
    ): RedirectResponse {
        $validated = $request->validated();

        DB::transaction(function () use (
            $request,
            $validated,
            $ppmp
        ): void {
            $ppmp->update([
                'fiscal_year' =>
                    $validated['fiscal_year'],

                'plan_type' =>
                    $validated['plan_type'],

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
                    $request->user()->id,
            ]);

            $savedItemIds = [];
            $totalCents = 0;

            foreach (
                $validated['items']
                as $index => $itemData
            ) {
                if (
                    ! $this->itemHasContent(
                        $itemData
                    )
                ) {
                    continue;
                }

                $amount =
                    (float) (
                        $itemData[
                            'estimated_budget'
                        ] ?? 0
                    );

                $amountCents =
                    (int) round(
                        $amount * 100
                    );

                $totalCents += $amountCents;

                $item = null;

                if (
                    ! empty(
                        $itemData['id']
                    )
                ) {
                    $item = $ppmp
                        ->items()
                        ->findOrFail(
                            $itemData['id']
                        );
                }

                $values = [
                    'description_objective' =>
                        $itemData[
                            'description_objective'
                        ] ?? '',

                    'project_type' =>
                        $itemData[
                            'project_type'
                        ] ?? '',

                    'quantity_size' =>
                        $itemData[
                            'quantity_size'
                        ] ?? '',

                    'recommended_mode_of_procurement' =>
                        $itemData[
                            'recommended_mode_of_procurement'
                        ] ?? '',

                    'pre_procurement_conference' =>
                        (bool) (
                            $itemData[
                                'pre_procurement_conference'
                            ] ?? false
                        ),

                    'procurement_start_month' =>
                        $itemData[
                            'procurement_start_month'
                        ] ?? '',

                    'procurement_end_month' =>
                        $itemData[
                            'procurement_end_month'
                        ] ?? '',

                    'expected_delivery_month' =>
                        $itemData[
                            'expected_delivery_month'
                        ] ?? '',

                    'source_of_funds' =>
                        $itemData[
                            'source_of_funds'
                        ] ?? '',

                    'estimated_budget' =>
                        number_format(
                            $amountCents / 100,
                            2,
                            '.',
                            ''
                        ),

                    'remarks' =>
                        $itemData['remarks']
                        ?? null,

                    'sort_order' =>
                        $index + 1,
                ];

                if ($item) {
                    $item->update($values);
                } else {
                    $item = $ppmp
                        ->items()
                        ->create($values);
                }

                $savedItemIds[] =
                    $item->id;
            }

            /*
            * Remove rows deleted from the form.
            *
            * Don't delete an item that already has
            * supporting documents without deleting
            * its files first.
            */
            $itemsToDelete = $ppmp
                ->items()
                ->whereNotIn(
                    'id',
                    $savedItemIds
                )
                ->with('attachments')
                ->get();

            foreach ($itemsToDelete as $item) {
                foreach (
                    $item->attachments
                    as $attachment
                ) {
                    Storage::disk('local')
                        ->delete(
                            $attachment->file_path
                        );
                }

                $item->delete();
            }

            $totalBudget = number_format(
                $totalCents / 100,
                2,
                '.',
                ''
            );

            $ppmp->update([
                'total_budget' =>
                    $totalBudget,

                'updated_by' =>
                    $request->user()->id,
            ]);

            $this->auditLogService->record(
                module: 'ppmp',
                action: 'ppmp-updated',
                subject: $ppmp,

                description:
                    "Updated {$ppmp->ppmp_no}.",

                newValues: [
                    'total_budget' =>
                        $totalBudget,

                    'items_count' =>
                        count(
                            $savedItemIds
                        ),
                ],

                request: $request
            );
        });

        return redirect()
            ->route(
                'ppmps.show',
                $ppmp
            )
            ->with(
                'success',
                'PPMP draft updated successfully.'
            );
    }

    private function ensureCanView(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        $allowed =
            $user->can('ppmps.view-all')
            || (
                $user->can(
                    'ppmps.view-own'
                )
                && $user->office_id
                    === $ppmp->office_id
            );

        abort_unless($allowed, 403);
    }

    private function ensureCanEdit(
        Request $request,
        Ppmp $ppmp
    ): void {
        $user = $request->user();

        $allowed =
            $user->hasRole(
                'ppmp-coordinator'
            )
            && $user->can(
                'ppmps.update-own'
            )
            && $user->office_id
                === $ppmp->office_id
            && $ppmp->isEditable();

        abort_unless(
            $allowed,
            403,
            'This PPMP cannot be edited.'
        );
    }

}
