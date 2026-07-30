<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Admin\UserAccountController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::prefix('admin')
        ->name('admin.')
        ->group(function () {
                Route::get('users', [UserController::class, 'index'])
                    ->middleware('permission:users.view')
                    ->name('users.index');

                Route::get('users/create', [UserController::class, 'create'])
                    ->middleware('permission:users.create')
                    ->name('users.create');

                Route::post('users', [UserController::class, 'store'])
                    ->middleware('permission:users.create')
                    ->name('users.store');

                Route::get('users/{user}', [UserController::class, 'show'])
                    ->whereNumber('user')
                    ->middleware('permission:users.view')
                    ->name('users.show');

                Route::get('users/{user}/edit', [UserController::class, 'edit'])
                    ->whereNumber('user')
                    ->middleware('permission:users.update')
                    ->name('users.edit');

                Route::put('users/{user}', [UserController::class, 'update'])
                    ->whereNumber('user')
                    ->middleware('permission:users.update')
                    ->name('users.update');

                Route::get(
                    'users/{user}/reset-password',
                    [UserAccountController::class, 'editPassword']
                )
                    ->whereNumber('user')
                    ->middleware('permission:users.reset-password')
                    ->name('users.password.edit');

                Route::put(
                    'users/{user}/reset-password',
                    [UserAccountController::class, 'updatePassword']
                )
                    ->whereNumber('user')
                    ->middleware('permission:users.reset-password')
                    ->name('users.password.update');

                Route::patch(
                    'users/{user}/activate',
                    [UserAccountController::class, 'activate']
                )
                    ->whereNumber('user')
                    ->middleware('permission:users.activate')
                    ->name('users.activate');

                Route::patch(
                    'users/{user}/deactivate',
                    [UserAccountController::class, 'deactivate']
                )
                    ->whereNumber('user')
                    ->middleware('permission:users.deactivate')
                    ->name('users.deactivate');

                Route::patch(
                    'users/{user}/unlock',
                    [UserAccountController::class, 'unlock']
                )
                    ->whereNumber('user')
                    ->middleware('permission:users.unlock')
                    ->name('users.unlock');



        });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
