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
        /*
         * Clear cached roles and permissions before seeding.
         */
        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();

        /*
         |--------------------------------------------------------------------------
         | Permissions
         |--------------------------------------------------------------------------
         */
        $permissions = [
            // Dashboard
            'dashboard.view',

            // Personal account
            'profile.view',
            'profile.update',
            'profile.change-password',

            /*
             |--------------------------------------------------------------------------
             | User Management
             |--------------------------------------------------------------------------
             */
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

            /*
             |--------------------------------------------------------------------------
             | Role and Permission Management
             |--------------------------------------------------------------------------
             */
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'roles.assign-permissions',

            /*
             |--------------------------------------------------------------------------
             | Audit and Login Logs
             |--------------------------------------------------------------------------
             */
            'audit-logs.view',
            'audit-logs.export',
            'login-logs.view',

            /*
             |--------------------------------------------------------------------------
             | PPMP - End User / Coordinator
             |--------------------------------------------------------------------------
             */
            'ppmps.view-own',
            'ppmps.create',
            'ppmps.update-own',
            'ppmps.submit',
            'ppmps.resubmit',

            /*
             |--------------------------------------------------------------------------
             | PPMP - GSPS Administration
             |--------------------------------------------------------------------------
             */
            'ppmps.view-all',
            'ppmps.return',
            'ppmps.approve',
            'ppmps.upload-approved-copy',

            /*
             |--------------------------------------------------------------------------
             | Purchase Request - End User
             |--------------------------------------------------------------------------
             */
            'prs.view-own',
            'prs.create',
            'prs.update-own',
            'prs.submit',
            'prs.resubmit',

            /*
             |--------------------------------------------------------------------------
             | Purchase Request - GSPS Administration
             |--------------------------------------------------------------------------
             */
            'prs.view-all',
            'prs.return',
            'prs.approve',
            'prs.upload-approved-copy',
        ];

        /*
         * Create permissions if they do not already exist.
         */
        foreach ($permissions as $permission) {
            Permission::findOrCreate(
                $permission,
                'web'
            );
        }

        /*
         |--------------------------------------------------------------------------
         | Basic Permissions
         |--------------------------------------------------------------------------
         |
         | These permissions are shared by regular authenticated users.
         |
         */
        $basicPermissions = [
            'dashboard.view',
            'profile.view',
            'profile.update',
            'profile.change-password',
        ];

        /*
         |--------------------------------------------------------------------------
         | Role Permissions
         |--------------------------------------------------------------------------
         */
        $rolePermissions = [
            /*
             * System Administrator
             *
             * Receives every permission currently registered
             * in this seeder.
             */
            'system-administrator' => $permissions,

            /*
             * Requesting Personnel
             *
             * Basic access for now.
             * We can expand this role when additional
             * procurement modules are implemented.
             */
            'requesting-personnel' => [
                ...$basicPermissions,
            ],

            /*
             * Budget Officer
             */
            'budget-officer' => [
                ...$basicPermissions,
            ],

            /*
             * Approving Authority
             */
            'approving-authority' => [
                ...$basicPermissions,
            ],

            /*
             * Procurement Personnel / BAC
             */
            'procurement-personnel-bac' => [
                ...$basicPermissions,
            ],

            /*
             * Management User
             */
            'management-user' => [
                ...$basicPermissions,
            ],

            /*
             * Auditor
             */
            'auditor' => [
                ...$basicPermissions,

                'audit-logs.view',
                'audit-logs.export',
                'login-logs.view',
            ],

            /*
             |--------------------------------------------------------------------------
             | PPMP Coordinator / End User
             |--------------------------------------------------------------------------
             |
             | The PPMP Coordinator:
             | - Manages PPMPs for their own division.
             | - Creates Purchase Requests from approved PPMPs.
             | - Manages their own PRs.
             |
             */
            'ppmp-coordinator' => [
                ...$basicPermissions,

                // PPMP
                'ppmps.view-own',
                'ppmps.create',
                'ppmps.update-own',
                'ppmps.submit',
                'ppmps.resubmit',

                // Purchase Requests
                'prs.view-own',
                'prs.create',
                'prs.update-own',
                'prs.submit',
                'prs.resubmit',
            ],

            /*
             |--------------------------------------------------------------------------
             | GSPS Administrator
             |--------------------------------------------------------------------------
             |
             | The GSPS Administrator:
             | - Views PPMPs from all divisions.
             | - Returns or approves PPMPs.
             | - Uploads approved PPMP copies.
             | - Views all Purchase Requests.
             | - Returns or approves Purchase Requests.
             | - Uploads approved PR copies.
             |
             */
            'gsps-administrator' => [
                ...$basicPermissions,

                // PPMP Administration
                'ppmps.view-all',
                'ppmps.return',
                'ppmps.approve',
                'ppmps.upload-approved-copy',

                // Purchase Request Administration
                'prs.view-all',
                'prs.return',
                'prs.approve',
                'prs.upload-approved-copy',
            ],
        ];

        /*
         * Create roles and synchronize their permissions.
         */
        foreach (
            $rolePermissions
            as $roleName => $assignedPermissions
        ) {
            $role = Role::findOrCreate(
                $roleName,
                'web'
            );

            $role->syncPermissions(
                $assignedPermissions
            );
        }

        /*
         * Clear permission cache again after synchronization.
         */
        app(PermissionRegistrar::class)
            ->forgetCachedPermissions();
    }
}
