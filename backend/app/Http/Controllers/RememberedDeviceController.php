<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RememberedDeviceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $devices = $request->user()->rememberedDevices()
            ->orderBy('last_used_at', 'desc')
            ->get()
            ->map(fn ($d) => [
                'id' => (string) $d->id,
                'device_name' => $d->device_name ?? 'Unknown Device',
                'ip_address' => $d->ip_address,
                'last_used_at' => $d->last_used_at?->toIso8601String(),
            ]);

        return response()->json(['devices' => $devices]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $device = $request->user()->rememberedDevices()->find((int) $id);

        if (! $device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        $device->delete();

        return response()->json(['message' => 'Auto-login revoked for this device.']);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        $request->user()->rememberedDevices()->delete();

        return response()->json(['message' => 'All auto-login sessions revoked.']);
    }
}
