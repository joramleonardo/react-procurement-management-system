<?php

namespace App\Http\Controllers;

use App\Models\Ppmp;
use App\Models\PpmpStatusHistory;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestStatusHistory;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;


class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $user->loadMissing([
            'office:id,code,name',
            'roles:id,name',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Permissions
        |--------------------------------------------------------------------------
        */

        $canViewAllPpmps =
            $user->can('ppmps.view-all');

        $canViewOwnPpmps =
            $user->can('ppmps.view-own');

        $canViewPpmps =
            $canViewAllPpmps ||
            $canViewOwnPpmps;

        $canViewAllPrs =
            $user->can('prs.view-all');

        $canViewOwnPrs =
            $user->can('prs.view-own');

        $canViewPrs =
            $canViewAllPrs ||
            $canViewOwnPrs;

        /*
        |--------------------------------------------------------------------------
        | PPMP Visibility
        |--------------------------------------------------------------------------
        */

        $ppmpQuery =
            Ppmp::query();

        if (! $canViewPpmps) {
            $ppmpQuery
                ->whereRaw('1 = 0');
        } elseif (! $canViewAllPpmps) {
            $ppmpQuery
                ->where(
                    'office_id',
                    $user->office_id
                );
        }

        /*
        |--------------------------------------------------------------------------
        | PR Visibility
        |--------------------------------------------------------------------------
        */

        $prQuery =
            PurchaseRequest::query();

        if (! $canViewPrs) {
            $prQuery
                ->whereRaw('1 = 0');
        } elseif (! $canViewAllPrs) {
            $prQuery
                ->where(
                    'office_id',
                    $user->office_id
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Main Statistics
        |--------------------------------------------------------------------------
        */

        $stats = [
            'total_ppmps' =>
                (clone $ppmpQuery)
                    ->count(),

            'total_prs' =>
                (clone $prQuery)
                    ->count(),

            'for_review' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'submitted'
                    )
                    ->count()
                +
                (clone $prQuery)
                    ->where(
                        'status',
                        'submitted'
                    )
                    ->count(),

            'for_revision' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'returned_for_revision'
                    )
                    ->count()
                +
                (clone $prQuery)
                    ->where(
                        'status',
                        'returned_for_revision'
                    )
                    ->count(),

            'approved' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'approved'
                    )
                    ->count()
                +
                (clone $prQuery)
                    ->where(
                        'status',
                        'approved'
                    )
                    ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | PPMP Status Breakdown
        |--------------------------------------------------------------------------
        */

        $ppmpStatuses = [
            'draft' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'draft'
                    )
                    ->count(),

            'submitted' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'submitted'
                    )
                    ->count(),

            'returned_for_revision' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'returned_for_revision'
                    )
                    ->count(),

            'approved' =>
                (clone $ppmpQuery)
                    ->where(
                        'status',
                        'approved'
                    )
                    ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | PR Status Breakdown
        |--------------------------------------------------------------------------
        */

        $prStatuses = [
            'draft' =>
                (clone $prQuery)
                    ->where(
                        'status',
                        'draft'
                    )
                    ->count(),

            'submitted' =>
                (clone $prQuery)
                    ->where(
                        'status',
                        'submitted'
                    )
                    ->count(),

            'returned_for_revision' =>
                (clone $prQuery)
                    ->where(
                        'status',
                        'returned_for_revision'
                    )
                    ->count(),

            'approved' =>
                (clone $prQuery)
                    ->where(
                        'status',
                        'approved'
                    )
                    ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Monthly Procurement Trend
        |--------------------------------------------------------------------------
        |
        | Dashboard visualization only.
        |
        | The visibility rules are inherited from the same PPMP and PR queries
        | already used by the dashboard. This means coordinators only see data
        | available to their office while administrators with view-all permission
        | see organization-wide data.
        |
        */

        $currentYear = now()->year;

        $yearStart = Carbon::create(
            $currentYear,
            1,
            1
        )->startOfDay();

        $yearEnd = Carbon::create(
            $currentYear,
            12,
            31
        )->endOfDay();

        /*
        |--------------------------------------------------------------------------
        | PPMP Records Created This Year
        |--------------------------------------------------------------------------
        */

        $ppmpTrendRecords =
            (clone $ppmpQuery)
                ->whereBetween(
                    'created_at',
                    [
                        $yearStart,
                        $yearEnd,
                    ]
                )
                ->get([
                    'id',
                    'created_at',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Purchase Requests Created This Year
        |--------------------------------------------------------------------------
        */

        $prTrendRecords =
            (clone $prQuery)
                ->whereBetween(
                    'created_at',
                    [
                        $yearStart,
                        $yearEnd,
                    ]
                )
                ->get([
                    'id',
                    'created_at',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Approved PPMPs This Year
        |--------------------------------------------------------------------------
        */

        $approvedPpmpTrendRecords =
            (clone $ppmpQuery)
                ->where(
                    'status',
                    'approved'
                )
                ->whereNotNull(
                    'approved_at'
                )
                ->whereBetween(
                    'approved_at',
                    [
                        $yearStart,
                        $yearEnd,
                    ]
                )
                ->get([
                    'id',
                    'approved_at',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Approved PRs This Year
        |--------------------------------------------------------------------------
        */

        $approvedPrTrendRecords =
            (clone $prQuery)
                ->where(
                    'status',
                    'approved'
                )
                ->whereNotNull(
                    'approved_at'
                )
                ->whereBetween(
                    'approved_at',
                    [
                        $yearStart,
                        $yearEnd,
                    ]
                )
                ->get([
                    'id',
                    'approved_at',
                ]);

            /*
            |--------------------------------------------------------------------------
            | Build January – December Dataset
            |--------------------------------------------------------------------------
            */

            $monthlyTrend =
                collect(
                    range(1, 12)
                )
                    ->map(
                        function (
                            int $month
                        ) use (
                            $currentYear,
                            $ppmpTrendRecords,
                            $prTrendRecords,
                            $approvedPpmpTrendRecords,
                            $approvedPrTrendRecords
                        ): array {
                            $ppmpCount =
                                $ppmpTrendRecords
                                    ->filter(
                                        fn (Ppmp $ppmp) =>
                                            $ppmp
                                                ->created_at
                                                ?->month
                                            === $month
                                    )
                                    ->count();

                            $prCount =
                                $prTrendRecords
                                    ->filter(
                                        fn (
                                            PurchaseRequest $pr
                                        ) =>
                                            $pr
                                                ->created_at
                                                ?->month
                                            === $month
                                    )
                                    ->count();

                            $approvedPpmpCount =
                                $approvedPpmpTrendRecords
                                    ->filter(
                                        fn (Ppmp $ppmp) =>
                                            $ppmp
                                                ->approved_at
                                                ?->month
                                            === $month
                                    )
                                    ->count();

                            $approvedPrCount =
                                $approvedPrTrendRecords
                                    ->filter(
                                        fn (
                                            PurchaseRequest $pr
                                        ) =>
                                            $pr
                                                ->approved_at
                                                ?->month
                                            === $month
                                    )
                                    ->count();

                            return [
                                'month' =>
                                    Carbon::create(
                                        $currentYear,
                                        $month,
                                        1
                                    )->format('M'),

                                'ppmps' =>
                                    $ppmpCount,

                                'prs' =>
                                    $prCount,

                                'approved' =>
                                    $approvedPpmpCount
                                    +
                                    $approvedPrCount,
                            ];
                        }
                    )
                    ->values();

        /*
        |--------------------------------------------------------------------------
        | Determine What Needs Attention
        |--------------------------------------------------------------------------
        |
        | GSPS / Administrator:
        | Submitted records need review.
        |
        | PPMP Coordinator:
        | Returned records need correction.
        | Drafts may need completion.
        |
        */

        $canReviewPpmps =
            $user->can('ppmps.return')
            || $user->can('ppmps.approve');

        $canReviewPrs =
            $user->can('prs.return')
            || $user->can('prs.approve');

        $ppmpAttentionStatuses =
            $canReviewPpmps
                ? ['submitted']
                : [
                    'returned_for_revision',
                    'draft',
                ];

        $prAttentionStatuses =
            $canReviewPrs
                ? ['submitted']
                : [
                    'returned_for_revision',
                    'draft',
                ];

        /*
        |--------------------------------------------------------------------------
        | PPMP Attention Items
        |--------------------------------------------------------------------------
        */

        $attentionPpmps =
            (clone $ppmpQuery)
                ->with(
                    'office:id,code,name'
                )
                ->whereIn(
                    'status',
                    $ppmpAttentionStatuses
                )
                ->latest('updated_at')
                ->limit(6)
                ->get()
                ->map(
                    function (Ppmp $ppmp): array {
                        return [
                            'key' =>
                                'ppmp-' .
                                $ppmp->id,

                            'type' =>
                                'PPMP',

                            'reference' =>
                                $ppmp->ppmp_no,

                            'status' =>
                                $ppmp->status,

                            'office' =>
                                $ppmp
                                    ->office
                                    ?->code,

                            'context' =>
                                'FY ' .
                                $ppmp
                                    ->fiscal_year,

                            'updated_at' =>
                                $ppmp
                                    ->updated_at
                                    ?->format(
                                        'M d, Y h:i A'
                                    ),

                            'timestamp' =>
                                $ppmp
                                    ->updated_at
                                    ?->timestamp
                                ?? 0,

                            'url' =>
                                '/ppmps/' .
                                $ppmp->id,
                        ];
                    }
                );

        /*
        |--------------------------------------------------------------------------
        | PR Attention Items
        |--------------------------------------------------------------------------
        */

        $attentionPrs =
            (clone $prQuery)
                ->with([
                    'office:id,code,name',
                    'ppmp:id,ppmp_no',
                ])
                ->whereIn(
                    'status',
                    $prAttentionStatuses
                )
                ->latest('updated_at')
                ->limit(6)
                ->get()
                ->map(
                    function (
                        PurchaseRequest $pr
                    ): array {
                        return [
                            'key' =>
                                'pr-' .
                                $pr->id,

                            'type' =>
                                'PR',

                            'reference' =>
                                $pr->pr_no,

                            'status' =>
                                $pr->status,

                            'office' =>
                                $pr
                                    ->office
                                    ?->code,

                            'context' =>
                                $pr
                                    ->ppmp
                                    ?->ppmp_no,

                            'updated_at' =>
                                $pr
                                    ->updated_at
                                    ?->format(
                                        'M d, Y h:i A'
                                    ),

                            'timestamp' =>
                                $pr
                                    ->updated_at
                                    ?->timestamp
                                ?? 0,

                            /*
                             * PR Show page will be
                             * added in PR Step 3.
                             */
                            'url' =>
                                '/purchase-requests',
                        ];
                    }
                );

        $attentionItems =
            $attentionPpmps
                ->concat(
                    $attentionPrs
                )
                ->sortByDesc(
                    'timestamp'
                )
                ->take(8)
                ->values()
                ->map(
                    function (
                        array $item
                    ): array {
                        unset(
                            $item[
                                'timestamp'
                            ]
                        );

                        return $item;
                    }
                );

        /*
        |--------------------------------------------------------------------------
        | PPMP Recent Activity
        |--------------------------------------------------------------------------
        */

        $ppmpActivityQuery =
            PpmpStatusHistory::query()
                ->with([
                    'ppmp:id,ppmp_no,office_id',
                    'actionBy:id,name',
                ]);

        if (! $canViewPpmps) {
            $ppmpActivityQuery
                ->whereRaw('1 = 0');
        } elseif (! $canViewAllPpmps) {
            $ppmpActivityQuery
                ->whereHas(
                    'ppmp',
                    function ($query) use ($user) {
                        $query->where(
                            'office_id',
                            $user->office_id
                        );
                    }
                );
        }

        $ppmpActivities =
            $ppmpActivityQuery
                ->latest('acted_at')
                ->limit(8)
                ->get()
                ->map(
                    function (
                        PpmpStatusHistory $history
                    ): array {
                        return [
                            'key' =>
                                'ppmp-history-' .
                                $history->id,

                            'type' =>
                                'PPMP',

                            'reference' =>
                                $history
                                    ->ppmp
                                    ?->ppmp_no
                                ?? 'PPMP',

                            'action' =>
                                $history->action,

                            'status' =>
                                $history
                                    ->to_status,

                            'actor' =>
                                $history
                                    ->actionBy
                                    ?->name
                                ?? 'System',

                            'acted_at' =>
                                $history
                                    ->acted_at
                                    ?->format(
                                        'M d, Y h:i A'
                                    ),

                            'timestamp' =>
                                $history
                                    ->acted_at
                                    ?->timestamp
                                ?? 0,

                            'url' =>
                                $history->ppmp
                                    ? '/ppmps/' .
                                        $history
                                            ->ppmp
                                            ->id
                                    : '/ppmps',
                        ];
                    }
                );

        /*
        |--------------------------------------------------------------------------
        | PR Recent Activity
        |--------------------------------------------------------------------------
        */

        $prActivityQuery =
            PurchaseRequestStatusHistory::query()
                ->with([
                    'purchaseRequest:id,pr_no,office_id',
                    'actionBy:id,name',
                ]);

        if (! $canViewPrs) {
            $prActivityQuery
                ->whereRaw('1 = 0');
        } elseif (! $canViewAllPrs) {
            $prActivityQuery
                ->whereHas(
                    'purchaseRequest',
                    function ($query) use ($user) {
                        $query->where(
                            'office_id',
                            $user->office_id
                        );
                    }
                );
        }

        $prActivities =
            $prActivityQuery
                ->latest('acted_at')
                ->limit(8)
                ->get()
                ->map(
                    function (
                        PurchaseRequestStatusHistory $history
                    ): array {
                        return [
                            'key' =>
                                'pr-history-' .
                                $history->id,

                            'type' =>
                                'PR',

                            'reference' =>
                                $history
                                    ->purchaseRequest
                                    ?->pr_no
                                ?? 'PR',

                            'action' =>
                                $history->action,

                            'status' =>
                                $history
                                    ->to_status,

                            'actor' =>
                                $history
                                    ->actionBy
                                    ?->name
                                ?? 'System',

                            'acted_at' =>
                                $history
                                    ->acted_at
                                    ?->format(
                                        'M d, Y h:i A'
                                    ),

                            'timestamp' =>
                                $history
                                    ->acted_at
                                    ?->timestamp
                                ?? 0,

                            /*
                             * Temporary until
                             * PR Step 3.
                             */
                            'url' =>
                                '/purchase-requests',
                        ];
                    }
                );

        $recentActivity =
            $ppmpActivities
                ->concat(
                    $prActivities
                )
                ->sortByDesc(
                    'timestamp'
                )
                ->take(10)
                ->values()
                ->map(
                    function (
                        array $item
                    ): array {
                        unset(
                            $item[
                                'timestamp'
                            ]
                        );

                        return $item;
                    }
                );

        /*
        |--------------------------------------------------------------------------
        | Return Dashboard
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'dashboard',
            [
                'userSummary' => [
                    'name' =>
                        $user->name,

                    'office_code' =>
                        $user
                            ->office
                            ?->code,

                    'office_name' =>
                        $user
                            ->office
                            ?->name,

                    'roles' =>
                        $user
                            ->roles
                            ->pluck(
                                'name'
                            )
                            ->values(),
                ],

                'stats' =>
                    $stats,

                'ppmpStatuses' =>
                    $ppmpStatuses,

                'prStatuses' =>
                    $prStatuses,

                'monthlyTrend' =>
                    $monthlyTrend,

                'attentionItems' =>
                    $attentionItems,

                'recentActivity' =>
                    $recentActivity,

                'quickActions' => [
                    'create_ppmp' =>
                        $user->can(
                            'ppmps.create'
                        ),

                    'view_ppmps' =>
                        $canViewPpmps,

                    'view_prs' =>
                        $canViewPrs,

                    'review_ppmps' =>
                        $canReviewPpmps,

                    'review_prs' =>
                        $canReviewPrs,
                ],
            ]
        );
    }
}
