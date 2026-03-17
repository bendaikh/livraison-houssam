<?php

namespace App\Http\Controllers;

use App\Models\BlacklistEntry;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BlacklistController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeBlacklistAccess($request);

        $query = BlacklistEntry::query()->latest();

        if ($request->filled('search')) {
            $search = trim((string) $request->string('search'));
            $normalized = BlacklistEntry::normalizePhone($search);

            $query->where(function ($builder) use ($search, $normalized) {
                $builder->where('phone_number', 'like', '%' . $search . '%')
                    ->orWhere('reason', 'like', '%' . $search . '%');

                if ($normalized !== '') {
                    $builder->orWhere('normalized_phone', 'like', '%' . $normalized . '%');
                }
            });
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request)
    {
        $this->authorizeBlacklistAccess($request);

        $validated = $this->validatePayload($request);
        $normalizedPhone = BlacklistEntry::normalizePhone($validated['phone_number']);

        if ($normalizedPhone === '') {
            throw ValidationException::withMessages([
                'phone_number' => ['Enter a valid phone number.'],
            ]);
        }

        if (BlacklistEntry::where('normalized_phone', $normalizedPhone)->exists()) {
            throw ValidationException::withMessages([
                'phone_number' => ['This phone number is already blacklisted.'],
            ]);
        }

        $entry = BlacklistEntry::create($validated);

        return response()->json($entry, 201);
    }

    public function update(Request $request, BlacklistEntry $blacklist)
    {
        $this->authorizeBlacklistAccess($request);

        $validated = $this->validatePayload($request);
        $normalizedPhone = BlacklistEntry::normalizePhone($validated['phone_number']);

        if ($normalizedPhone === '') {
            throw ValidationException::withMessages([
                'phone_number' => ['Enter a valid phone number.'],
            ]);
        }

        if (
            BlacklistEntry::where('normalized_phone', $normalizedPhone)
                ->whereKeyNot($blacklist->id)
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'phone_number' => ['This phone number is already blacklisted.'],
            ]);
        }

        $blacklist->update($validated);

        return response()->json($blacklist->fresh());
    }

    public function destroy(Request $request, BlacklistEntry $blacklist)
    {
        $this->authorizeBlacklistAccess($request);

        $blacklist->delete();

        return response()->json(['message' => 'Blacklist entry deleted successfully.']);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'phone_number' => 'required|string|max:30',
            'reason' => 'required|string',
            'cancellation_timing' => 'required|in:before_confirmation,after_confirmation',
        ]);
    }

    private function authorizeBlacklistAccess(Request $request): void
    {
        $user = $request->user();

        if (!$user || !($user->isAdmin() || $user->isConfirmationAgent())) {
            abort(403, 'You are not allowed to access the blacklist.');
        }
    }
}
