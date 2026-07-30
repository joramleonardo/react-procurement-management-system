<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\Office;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Display the users management page.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');

        $allowedStatuses = [
            'pending',
            'active',
            'inactive',
            'locked',
        ];

        $users = User::query()
            ->with([
                'office:id,code,name',
                'roles:id,name',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($userQuery) use ($search) {
                    $userQuery
                        ->where('employee_id', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('position_title', 'like', "%{$search}%");
                });
            })
            ->when(
                in_array($status, $allowedStatuses, true),
                fn ($query) => $query->where('status', $status)
            )
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'username' => $user->username,
                'name' => $user->name,
                'email' => $user->email,
                'position_title' => $user->position_title,
                'status' => $user->status,

                'office' => $user->office
                    ? [
                        'id' => $user->office->id,
                        'code' => $user->office->code,
                        'name' => $user->office->name,
                    ]
                    : null,

                'roles' => $user->roles
                    ->pluck('name')
                    ->values()
                    ->all(),

                'last_login_at' => $user->last_login_at
                    ?->format('M d, Y h:i A'),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,

            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Display the create-user page.
     */
    public function create(): Response
    {
        $offices = Office::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
            ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ]);

        return Inertia::render('admin/users/create', [
            'offices' => $offices,
            'roles' => $roles,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(
        StoreUserRequest $request
    ): RedirectResponse {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $fullName = collect([
                $validated['first_name'],
                $validated['middle_name'] ?: null,
                $validated['last_name'],
                $validated['suffix'] ?: null,
            ])
                ->filter()
                ->implode(' ');

            $user = User::create([
                'employee_id' => $validated['employee_id'],
                'username' => $validated['username'],
                'name' => $fullName,
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?: null,
                'last_name' => $validated['last_name'],
                'suffix' => $validated['suffix'] ?: null,
                'email' => $validated['email'],
                'email_verified_at' => now(),
                'office_id' => $validated['office_id'] ?: null,
                'position_title' => $validated['position_title'] ?: null,
                'status' => $validated['status'],
                'auth_source' => 'local',
                'password' => $validated['password'],
                'must_change_password' =>
                    $validated['must_change_password'],
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $user->syncRoles([
                $validated['role'],
            ]);
        });

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User account created successfully.');
    }

    /**
     * Display a user account.
     */
    public function show(
        Request $request,
        User $user
    ): Response
    {
        $user->load([
            'office:id,code,name',
            'roles:id,name',
        ]);

        return Inertia::render('admin/users/show', [
            'user' => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'username' => $user->username,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'suffix' => $user->suffix,
                'email' => $user->email,
                'position_title' => $user->position_title,
                'status' => $user->status,
                'auth_source' => $user->auth_source,
                'must_change_password' => $user->must_change_password,

                'office' => $user->office
                    ? [
                        'id' => $user->office->id,
                        'code' => $user->office->code,
                        'name' => $user->office->name,
                    ]
                    : null,

                'roles' => $user->roles
                    ->pluck('name')
                    ->values()
                    ->all(),

                'last_login_at' => $user->last_login_at
                    ?->format('M d, Y h:i A'),

                'last_login_ip' => $user->last_login_ip,

                'password_changed_at' => $user->password_changed_at
                    ?->format('M d, Y h:i A'),

                'created_at' => $user->created_at
                    ?->format('M d, Y h:i A'),

                'updated_at' => $user->updated_at
                    ?->format('M d, Y h:i A'),

                'is_locked' => $user->isLocked(),
            ],

            'can' => [
                'update' => $request->user()->can(
                    'users.update'
                ),

                'reset_password' => $request->user()->can(
                    'users.reset-password'
                ),

                'activate' => $request->user()->can(
                    'users.activate'
                ),

                'deactivate' => $request->user()->can(
                    'users.deactivate'
                ),

                'unlock' => $request->user()->can(
                    'users.unlock'
                ),

                'is_self' => $request->user()->is($user),
            ],

            'flash' => [
                'success' => $request
                    ->session()
                    ->get('success'),

                'error' => $request
                    ->session()
                    ->get('error'),
            ],

        ]);
    }

    /**
     * Display the edit-user page.
     */
    public function edit(User $user): Response
    {
        $user->load('roles:id,name');

        $offices = Office::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'code',
                'name',
            ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ]);

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'username' => $user->username,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'suffix' => $user->suffix,
                'email' => $user->email,
                'office_id' => $user->office_id,
                'position_title' => $user->position_title,
                'status' => $user->status,
                'role' => $user->roles->first()?->name ?? '',
            ],

            'offices' => $offices,
            'roles' => $roles,
        ]);
    }

    /**
     * Update an existing user account.
     */
    public function update(
        UpdateUserRequest $request,
        User $user
    ): RedirectResponse {
        $validated = $request->validated();
        $currentUser = $request->user();

        /*
        * Prevent users from disabling or locking their own account.
        */
        if (
            $currentUser->is($user)
            && $validated['status'] !== 'active'
        ) {
            return back()->withErrors([
                'status' =>
                    'You cannot deactivate, lock, or suspend your own account.',
            ]);
        }

        /*
        * Prevent a System Administrator from removing their own
        * administrator role.
        */
        if (
            $currentUser->is($user)
            && $user->hasRole('system-administrator')
            && $validated['role'] !== 'system-administrator'
        ) {
            return back()->withErrors([
                'role' =>
                    'You cannot remove your own System Administrator role.',
            ]);
        }

        $activeSystemAdministratorCount = User::query()
            ->where('status', 'active')
            ->whereHas('roles', function ($query): void {
                $query->where('name', 'system-administrator');
            })
            ->count();

        $isLastActiveSystemAdministrator =
            $user->status === 'active'
            && $user->hasRole('system-administrator')
            && $activeSystemAdministratorCount <= 1;

        if (
            $isLastActiveSystemAdministrator
            && (
                $validated['status'] !== 'active'
                || $validated['role'] !== 'system-administrator'
            )
        ) {
            return back()->withErrors([
                'status' =>
                    'The final active System Administrator cannot be deactivated or assigned another role.',
            ]);
        }

        DB::transaction(function () use (
            $validated,
            $user,
            $currentUser
        ): void {
            $fullName = collect([
                $validated['first_name'],
                $validated['middle_name'] ?: null,
                $validated['last_name'],
                $validated['suffix'] ?: null,
            ])
                ->filter()
                ->implode(' ');

            $user->update([
                'employee_id' => $validated['employee_id'],
                'username' => $validated['username'],
                'name' => $fullName,
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?: null,
                'last_name' => $validated['last_name'],
                'suffix' => $validated['suffix'] ?: null,
                'email' => $validated['email'],
                'office_id' => $validated['office_id'] ?: null,
                'position_title' => $validated['position_title'] ?: null,
                'status' => $validated['status'],
                'updated_by' => $currentUser->id,
            ]);

            $user->syncRoles([
                $validated['role'],
            ]);
        });

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'User account updated successfully.');
    }
}
