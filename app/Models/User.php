<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'is_active',
        'phone',
        'address',
        'commission_per_order',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'effective_commission_per_order',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'commission_per_order' => 'decimal:2',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function vendor()
    {
        return $this->hasOne(Vendor::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function deliveryOrders()
    {
        return $this->hasMany(Order::class, 'delivery_agent_id');
    }

    public function confirmationOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'confirmation_agent_id');
    }

    public function assignedDeliveryOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'delivery_person_id');
    }

    public function confirmationBillings(): HasMany
    {
        return $this->hasMany(ConfirmationAgentBilling::class);
    }

    public function deliveryPersonBillings(): HasMany
    {
        return $this->hasMany(DeliveryPersonBilling::class, 'delivery_person_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->role && in_array($permission, $this->role->permissions ?? []);
    }

    public function hasRole(string $role): bool
    {
        return $this->role && $this->role->slug === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->role && in_array($this->role->slug, $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->hasAnyRole(['admin', 'superadmin']);
    }

    public function isVendor(): bool
    {
        return $this->hasAnyRole(['vendor', 'seller']);
    }

    public function isConfirmationAgent(): bool
    {
        return $this->hasAnyRole(['confirmation_agent', 'agent_confirmation']);
    }

    public function isDeliveryPerson(): bool
    {
        return $this->hasAnyRole(['delivery_person', 'delivery']);
    }

    public function isManager(): bool
    {
        return $this->hasRole('manager');
    }

    public function getEffectiveCommissionPerOrderAttribute(): float
    {
        $commission = (float) ($this->commission_per_order ?? 0);

        if ($this->isConfirmationAgent() && $commission <= 0) {
            return (float) Setting::get('confirmation_agent_commission_per_order', 0);
        }

        if ($this->isDeliveryPerson() && $commission <= 0) {
            return (float) Setting::get('delivery_person_commission_per_order', 0);
        }

        return $commission;
    }
}
