<?php

namespace App\Services;

class DeliveryStatusMapper
{
    public function mapToOrderStatus(?string $deliveryStatus, ?string $provider = null): ?string
    {
        if (!$deliveryStatus) {
            return null;
        }

        $normalizedStatus = mb_strtolower(trim($deliveryStatus));
        $normalizedProvider = mb_strtolower(trim((string) $provider));

        if ($normalizedProvider === 'tawsilex') {
            $tawsilexStatusMap = [
                'sent' => 'shipped',
                'livree' => 'delivered',
                'livrée' => 'delivered',
                'livre' => 'delivered',
                'livré' => 'delivered',
            ];

            if (isset($tawsilexStatusMap[$normalizedStatus])) {
                return $tawsilexStatusMap[$normalizedStatus];
            }
        }

        $statusMap = [
            'pending' => 'pending',
            'confirmed' => 'confirmed',
            'picked_up' => 'picked_up',
            'in_transit' => 'shipped',
            'out_for_delivery' => 'out_for_delivery',
            'delivered' => 'delivered',
            'cancelled' => 'cancelled',
            'returned' => 'returned',
            'no_response' => 'no_response',
            'failed' => 'cancelled',
            'refused' => 'refused',

            'en attente de ramassage' => 'confirmed',
            'en attente de rammage' => 'confirmed',
            'ramassé' => 'picked_up',
            'ramasse' => 'picked_up',
            'prêt pour expédition' => 'ready_for_shipping',
            'pret pour expedition' => 'ready_for_shipping',
            'expédié' => 'shipped',
            'expedie' => 'shipped',
            'en cours de livraison' => 'out_for_delivery',
            'en livraison' => 'out_for_delivery',
            'livré' => 'delivered',
            'livre' => 'delivered',
            'refusé' => 'refused',
            'refuse' => 'refused',
            'retourné' => 'returned',
            'retourne' => 'returned',
            'retour client reçu' => 'returned',
            'retour client recu' => 'returned',
            'retour client' => 'returned',
            'retour reçu' => 'returned',
            'retour recu' => 'returned',
            'annulé' => 'cancelled',
            'annule' => 'cancelled',
            'demande de retour' => 'return_requested',
            'demande_de_retour' => 'return_requested',
            'injoignable' => 'no_response',
            'injoignable client' => 'no_response',
            'hors zone' => 'cancelled',
            'adresse incomplète' => 'cancelled',
            'adresse incomplete' => 'cancelled',
            'reporté' => 'reported',
            'reporte' => 'reported',
            'reporter' => 'reported',
            'en cours de préparation' => 'ready_for_shipping',
            'en cours de preparation' => 'ready_for_shipping',

            'ramassage' => 'picked_up',
            'en attente' => 'confirmed',
            'en_attente' => 'confirmed',
            'en cours' => 'shipped',
            'en_cours' => 'shipped',
            'en route' => 'out_for_delivery',
            'en_route' => 'out_for_delivery',
            'execute' => 'delivered',
            'exécuté' => 'delivered',
            'retour' => 'returned',
            'interesse' => 'confirmed',
            'intéressé' => 'confirmed',

            'preparation' => 'confirmed',
            'livraison' => 'out_for_delivery',
        ];

        if (isset($statusMap[$normalizedStatus])) {
            return $statusMap[$normalizedStatus];
        }

        // Fallback for BMDelivery variants like "Retour client reçu".
        if (
            str_contains($normalizedStatus, 'retour client')
            || str_contains($normalizedStatus, 'retour reçu')
            || str_contains($normalizedStatus, 'retour recu')
        ) {
            return 'returned';
        }

        return null;
    }
}
