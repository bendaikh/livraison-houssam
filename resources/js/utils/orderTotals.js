const INCLUDED_SHIPPING_SOURCES = ['custom_api', 'website', 'google_sheet', 'whatsapp', 'marketplace'];

function itemsTotal(order) {
    const fromItems = (order.items || []).reduce((sum, item) => {
        return sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0));
    }, 0);

    if (fromItems > 0) {
        return fromItems;
    }

    const storedSubtotal = parseFloat(order.subtotal);
    return Number.isFinite(storedSubtotal) ? storedSubtotal : 0;
}

function shopifySurcharge(order) {
    return order.source === 'shopify' && order.external_order_id ? 1 : 0;
}

export function shippingIncludedInPrice(order) {
    if (order.shipping_included_in_price) {
        return true;
    }

    if (INCLUDED_SHIPPING_SOURCES.includes(order.source)) {
        return true;
    }

    return Boolean(order.external_order_id) && order.source !== 'shopify';
}

export function resolveOrderDisplayTotals(order) {
    if (order.display_total != null && order.display_subtotal != null) {
        return {
            shippingIncluded: Boolean(order.shipping_included_in_price),
            displaySubtotal: parseFloat(order.display_subtotal) || 0,
            displayTotal: parseFloat(order.display_total) || 0,
            shippingCost: parseFloat(order.shipping_cost) || 0,
        };
    }

    const baseAmount = itemsTotal(order);
    const shippingCost = parseFloat(order.shipping_cost) || 0;
    const tax = parseFloat(order.tax) || 0;
    const discount = parseFloat(order.discount) || 0;
    const included = shippingIncludedInPrice(order);

    if (included) {
        return {
            shippingIncluded: true,
            displaySubtotal: baseAmount,
            displayTotal: baseAmount - discount + tax + shopifySurcharge(order),
            shippingCost,
        };
    }

    const storedTotal = parseFloat(order.total);
    const storedSubtotal = parseFloat(order.subtotal);

    return {
        shippingIncluded: false,
        displaySubtotal: Number.isFinite(storedSubtotal) ? storedSubtotal : baseAmount,
        displayTotal: Number.isFinite(storedTotal)
            ? storedTotal
            : baseAmount + shippingCost - discount + tax + shopifySurcharge(order),
        shippingCost,
    };
}
