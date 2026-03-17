const toNumber = (value) => {
    const parsed = parseFloat(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getProductBasePrice = (product) => (
    toNumber(product?.company_price ?? product?.price ?? product?.vendor_price ?? product?.cost_price ?? 0)
);

export const getAdminProductCost = (product) => (
    toNumber(product?.vendor_price ?? product?.cost_price ?? 0)
);

export const getAdminProductSellPrice = (product) => (
    toNumber(product?.company_price ?? product?.price ?? 0)
);

export const getFulfillmentPrice = (fulfillmentPrice = 10) => toNumber(fulfillmentPrice || 10);

export const calculateProfit = ({
    sellTotal = 0,
    productCostTotal = 0,
    shippingPrice = 0,
    fulfillmentPrice = 0,
    discount = 0,
} = {}) => (
    toNumber(sellTotal)
    - toNumber(productCostTotal)
    - toNumber(shippingPrice)
    - toNumber(fulfillmentPrice)
    - toNumber(discount)
);

export const calculateUpsellProfit = ({
    sellTotal = 0,
    productCostTotal = 0,
} = {}) => (
    toNumber(sellTotal) - toNumber(productCostTotal)
);

export const calculateOrderProfit = ({
    items = [],
    shippingPrice = 0,
    fulfillmentPrice = 0,
    discount = 0,
} = {}) => {
    const baseItems = items.filter((item) => !item?.is_upsell);
    const upsellItems = items.filter((item) => item?.is_upsell);

    const summarize = (list) => list.reduce((acc, item) => {
        const quantity = toNumber(item?.quantity);
        const sellPrice = toNumber(item?.price);
        const productCost = getProductBasePrice(item?.product);

        acc.sellTotal += sellPrice * quantity;
        acc.productCostTotal += productCost * quantity;

        return acc;
    }, { sellTotal: 0, productCostTotal: 0 });

    const baseSummary = summarize(baseItems);
    const upsellSummary = summarize(upsellItems);

    return calculateProfit({
        sellTotal: baseSummary.sellTotal - toNumber(discount),
        productCostTotal: baseSummary.productCostTotal,
        shippingPrice,
        fulfillmentPrice,
    }) + calculateUpsellProfit(upsellSummary);
};

export const calculateAdminProductProfit = (product) => (
    getAdminProductSellPrice(product) - getAdminProductCost(product)
);

export { toNumber };
