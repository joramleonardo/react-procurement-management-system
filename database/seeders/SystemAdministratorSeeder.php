<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class SystemAdministratorSeeder extends Seeder
{
    /**
     * Create the initial PMS system administrator.
     */
    public function run(): void
    {
        $administrator = config('pms.administrator');

        if (
            ! is_string($administrator['password'])
            || strlen($administrator['password']) < 12
        ) {
            throw new RuntimeException(
                'Set PMS_ADMIN_PASSWORD in the .env file using at least 12 characters.'
            );
        }

        $office = Office::firstOrCreate(
            [
                'code' => 'ADMIN',
            ],
            [
                'name' => 'System Administration',
                'description' => 'System administration and application management.',
                'is_active' => true,
            ]
        );

        $user = User::firstOrNew([
            'employee_id' => $administrator['employee_id'],
        ]);

        $isNewUser = ! $user->exists;

        $user->fill([
            'employee_id' => $administrator['employee_id'],
            'username' => $administrator['username'],
            'name' => $administrator['name'],
            'first_name' => 'System',
            'middle_name' => null,
            'last_name' => 'Administrator',
            'suffix' => null,
            'email' => $administrator['email'],
            'office_id' => $office->id,
            'position_title' => 'System Administrator',
            'status' => 'active',
            'auth_source' => 'local',
            'must_change_password' => false,
        ]);

        /*
         * Set the password only when the account is first created.
         * Running the seeder again will not unexpectedly reset it.
         */
        if ($isNewUser) {
            $user->password = Hash::make($administrator['password']);
        }

        /*
         * The starter dashboard may use the "verified" middleware.
         */
        if ($user->email_verified_at === null) {
            $user->email_verified_at = now();
        }

        $user->save();

        $user->syncRoles([
            'system-administrator',
        ]);

        $this->command?->info(
            'System Administrator account created or updated successfully.'
        );
    }
}
