<?php

return [
    'administrator' => [
        'employee_id' => env('PMS_ADMIN_EMPLOYEE_ID', 'ADMIN-001'),
        'username' => env('PMS_ADMIN_USERNAME', 'admin'),
        'name' => env('PMS_ADMIN_NAME', 'PMS System Administrator'),
        'email' => env('PMS_ADMIN_EMAIL', 'admin@pms.local'),
        'password' => env('PMS_ADMIN_PASSWORD'),
    ],
];
