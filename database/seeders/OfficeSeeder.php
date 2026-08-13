<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            [
                'code' => 'OD-MISPS',
                'name' => 'Office of the Director / Management Information System and Planning Services',
            ],
            [
                'code' => 'FAD',
                'name' => 'Finance and Administrative Division',
            ],
            [
                'code' => 'IRAD',
                'name' => 'Information Resources and Analysis Division',
            ],
            [
                'code' => 'CRPD',
                'name' => 'Communication Resources and Production Division',
            ],
        ];

        foreach ($offices as $office) {
            Office::updateOrCreate(
                [
                    'code' => $office['code'],
                ],
                [
                    'name' => $office['name'],
                    'is_active' => true,
                ]
            );
        }
    }
}
