export function parseDeliveryCitiesResponse(response) {
    const payload = response?.data;

    return {
        cities: Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.cities) ? payload.cities : []),
        warning: response?.headers?.['x-delivery-cities-warning'] || payload?.warning || '',
        source: response?.headers?.['x-delivery-cities-source'] || payload?.source || '',
    };
}

export function formatDeliveryDispatchFailureMessage(message) {
    const detail = String(message || 'Unknown delivery error.');

    if (/cURL error 35|TLS connect error|SSL routines|handshake/i.test(detail)) {
        return [
            'Order saved successfully, but delivery dispatch failed.',
            'The server could not establish a secure TLS/SSL connection to the delivery provider.',
            `Provider detail: ${detail}`,
            'Action: ask the hosting/server admin to check PHP cURL/OpenSSL, CA certificates, and outbound HTTPS access to BM Delivery.',
        ].join('\n\n');
    }

    return [
        'Order saved successfully, but delivery dispatch failed.',
        `Provider detail: ${detail}`,
    ].join('\n\n');
}
