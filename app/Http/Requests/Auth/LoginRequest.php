<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine whether the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the submitted values before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'login' => trim((string) $this->input('login')),
        ]);
    }

    /**
     * Get the validation rules.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'login' => [
                'required',
                'string',
                'max:255',
            ],
            'password' => [
                'required',
                'string',
            ],
            'remember' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    /**
     * Attempt to authenticate the request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $login = (string) $this->input('login');

        $user = User::query()
            ->where(function ($query) use ($login): void {
                $query
                    ->where('employee_id', $login)
                    ->orWhere('username', $login)
                    ->orWhere('email', $login);
            })
            ->first();

        $passwordIsValid = $user !== null
            && Hash::check(
                (string) $this->input('password'),
                $user->password
            );

        $accountIsAllowed = $user !== null
            && $user->isActive()
            && ! $user->isLocked();

        if (! $passwordIsValid || ! $accountIsAllowed) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'login' => trans('auth.failed'),
            ]);
        }

        Auth::login(
            $user,
            $this->boolean('remember')
        );

        RateLimiter::clear($this->throttleKey());

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $this->ip(),
        ])->saveQuietly();
    }

    /**
     * Ensure the authentication request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn(
            $this->throttleKey()
        );

        throw ValidationException::withMessages([
            'login' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate-limiting key for this login request.
     */
    public function throttleKey(): string
    {
        $login = Str::lower(
            (string) $this->input('login')
        );

        return Str::transliterate(
            $login.'|'.$this->ip()
        );
    }
}
