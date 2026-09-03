<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Admin\UserAccountController;
use App\Http\Controllers\PpmpController;
use App\Http\Controllers\PpmpAttachmentController;
use App\Http\Controllers\PpmpWorkflowController;
use App\Http\Controllers\PurchaseRequestController;
use App\Http\Controllers\DashboardController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {

    Route::get(
        '/dashboard',
        DashboardController::class
    )->name('dashboard');

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

    Route::get(
        'ppmps',
        [PpmpController::class, 'index']
    )->name('ppmps.index');

    Route::get(
        'ppmps/create',
        [PpmpController::class, 'create']
    )
        ->middleware('permission:ppmps.create')
        ->name('ppmps.create');

    Route::post(
        'ppmps',
        [PpmpController::class, 'store']
    )
        ->middleware('permission:ppmps.create')
        ->name('ppmps.store');

    Route::get(
        'ppmps/{ppmp}',
        [PpmpController::class, 'show']
    )
        ->whereNumber('ppmp')
        ->name('ppmps.show');

    Route::get(
        'ppmps/{ppmp}/edit',
        [PpmpController::class, 'edit']
    )
        ->whereNumber('ppmp')
        ->name('ppmps.edit');

    Route::put(
        'ppmps/{ppmp}',
        [PpmpController::class, 'update']
    )
        ->whereNumber('ppmp')
        ->name('ppmps.update');

    Route::post(
        'ppmps/{ppmp}/revisions',
        [PpmpController::class, 'createRevision']
    )
        ->whereNumber('ppmp')
        ->middleware('permission:ppmps.create')
        ->name('ppmps.revisions.store');

    Route::post(
        'ppmps/{ppmp}/items/{item}/attachments',
        [PpmpAttachmentController::class, 'store']
    )
        ->whereNumber('ppmp')
        ->whereNumber('item')
        ->name('ppmps.attachments.store');

    Route::get(
        'ppmps/{ppmp}/attachments/{attachment}/download',
        [PpmpAttachmentController::class, 'download']
    )
        ->whereNumber('ppmp')
        ->whereNumber('attachment')
        ->name('ppmps.attachments.download');

    Route::delete(
        'ppmps/{ppmp}/attachments/{attachment}',
        [PpmpAttachmentController::class, 'destroy']
    )
        ->whereNumber('ppmp')
        ->whereNumber('attachment')
        ->name('ppmps.attachments.destroy');

    Route::patch(
        'ppmps/{ppmp}/submit',
        [PpmpWorkflowController::class, 'submit']
    )
        ->whereNumber('ppmp')
        ->middleware('permission:ppmps.submit')
        ->name('ppmps.submit');

    Route::patch(
        'ppmps/{ppmp}/resubmit',
        [PpmpWorkflowController::class, 'resubmit']
    )
        ->whereNumber('ppmp')
        ->middleware('permission:ppmps.resubmit')
        ->name('ppmps.resubmit');

    Route::patch(
        'ppmps/{ppmp}/return-for-revision',
        [
            PpmpWorkflowController::class,
            'returnForRevision',
        ]
    )
        ->whereNumber('ppmp')
        ->middleware('permission:ppmps.return')
        ->name('ppmps.return-for-revision');

    Route::post(
        'ppmps/{ppmp}/approve',
        [PpmpWorkflowController::class, 'approve']
    )
        ->whereNumber('ppmp')
        ->middleware('permission:ppmps.approve')
        ->name('ppmps.approve');

    Route::get(
        'purchase-requests',
        [
            PurchaseRequestController::class,
            'index',
        ]
    )->name('purchase-requests.index');

    Route::get(
        'ppmps/{ppmp}/purchase-requests/create',
        [
            PurchaseRequestController::class,
            'create',
        ]
    )
        ->whereNumber('ppmp')
        ->middleware('permission:prs.create')
        ->name('purchase-requests.create');

    Route::post(
        'ppmps/{ppmp}/purchase-requests',
        [
            PurchaseRequestController::class,
            'store',
        ]
    )
        ->whereNumber('ppmp')
        ->middleware('permission:prs.create')
        ->name('purchase-requests.store');


});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
