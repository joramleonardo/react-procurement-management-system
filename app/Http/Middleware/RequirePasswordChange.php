<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePasswordChange
{
    /**
     * Require authenticated users to replace their temporary password.
     */
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $user = $request->user();

        if (
            $user === null
            || ! $user->must_change_password
        ) {
            return $next($request);
        }

        /*
         * Prevent a redirect loop and allow the user to sign out.
         */
        if (
            $request->routeIs('password.change-required.*')
            || $request->routeIs('logout')
        ) {
            return $next($request);
        }

        return redirect()->route(
            'password.change-required.edit'
        );
    }
}
