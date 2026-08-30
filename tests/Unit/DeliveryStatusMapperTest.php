<?php

namespace Tests\Unit;

use App\Services\DeliveryStatusMapper;
use PHPUnit\Framework\TestCase;

class DeliveryStatusMapperTest extends TestCase
{
    public function test_maps_retour_client_recu_to_returned(): void
    {
        $mapper = new DeliveryStatusMapper();

        $this->assertSame('returned', $mapper->mapToOrderStatus('Retour client reçu'));
        $this->assertSame('returned', $mapper->mapToOrderStatus('Retour client recu'));
        $this->assertSame('returned', $mapper->mapToOrderStatus('RETOUR CLIENT REÇU'));
        $this->assertSame('returned', $mapper->mapToOrderStatus('Retourné'));
        $this->assertSame('returned', $mapper->mapToOrderStatus('Retour'));
    }
}
