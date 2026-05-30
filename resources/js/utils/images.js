export function getImageSrc(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('/')) return imagePath;
    return `/storage/${imagePath}`;
}

export function getProductImageSrc(product) {
    if (product?.image_url) return product.image_url;
    if (product?.image_urls?.[0]) return product.image_urls[0];
    return getImageSrc(product?.images?.[0] || null);
}
