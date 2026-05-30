const SOURCE_LABELS = {
    manual: 'Manual',
    shopify: 'Shopify',
    google_sheet: 'Google Sheet',
    delivery_company: 'Delivery Company',
    marketplace: 'Marketplace',
    whatsapp: 'WhatsApp',
    custom_api: 'API Personnalisée',
    website: 'Website',
};

export function formatOrderSource(source) {
    if (!source) {
        return SOURCE_LABELS.manual;
    }

    return SOURCE_LABELS[source] || String(source).replace(/_/g, ' ');
}

export function getOrderSourceBadge(source) {
    return formatOrderSource(source).substring(0, 3).toUpperCase();
}

export const ORDER_SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, label]) => ({
    value,
    label,
}));
