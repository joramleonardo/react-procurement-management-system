<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();

        $permissions = [
            // Dashboard
            'dashboard.view',

            // Personal account
            'profile.view',
            'profile.update',
            'profile.change-password',

            // User management
            'users.view',
            'users.create',
            'users.update',
            'users.activate',
            'users.deactivate',
            'users.unlock',
            'users.reset-password',
            'users.assign-roles',
            'users.view-login-history',
            'users.export',

            // Role and permission management
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'roles.assign-permissions',

            // Audit logs
            'audit-logs.view',
            'audit-logs.export',
            'login-logs.view',

            // PPMP Coordinator
            'ppmps.view-own',
            'ppmps.create',
            'ppmps.update-own',
            'ppmps.submit',
            'ppmps.resubmit',

            // GSPS Administration
            'ppmps.view-all',
            'ppmps.return',
            'ppmps.approve',
            'ppmps.upload-approved-copy',

        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $basicPermissions = [
            'dashboard.view',
            'profile.view',
            'profile.update',
            'profile.change-password',
        ];

        $rolePermissions = [
            'system-administrator' => $permissions,

            'requesting-personnel' => $basicPermissions,

            'budget-officer' => $basicPermissions,

            'approving-authority' => $basicPermissions,

            'procurement-personnel-bac' => $basicPermissions,

            'management-user' => $basicPermissions,

            'auditor' => [
                ...$basicPermissions,
                'audit-logs.view',
                'audit-logs.export',
                'login-logs.view',
            ],

            'ppmp-coordinator' => [
                ...$basicPermissions,

                'ppmps.view-own',
                'ppmps.create',
                'ppmps.update-own',
                'ppmps.submit',
                'ppmps.resubmit',
            ],

            'gsps-administrator' => [
                ...$basicPermissions,

                'ppmps.view-all',
                'ppmps.return',
                'ppmps.approve',
                'ppmps.upload-approved-copy',
            ],

        ];

        foreach ($rolePermissions as $roleName => $assignedPermissions) {
            $role = Role::findOrCreate($roleName, 'web');

            $role->syncPermissions($assignedPermissions);
        }

        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
