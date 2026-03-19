export const normalizeCityName = (value) =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

export const isCasaCityName = (value) => normalizeCityName(value).includes('casa');

export const sameCityName = (left, right) => normalizeCityName(left) === normalizeCityName(right);

export const findMatchingCity = (cities = [], cityName = '') => {
    const normalized = normalizeCityName(cityName);
    return cities.find((city) => normalizeCityName(city.name) === normalized) || null;
};

export const resolveShippingCost = ({
    cityName = '',
    cities = [],
    emptyCost = 35,
} = {}) => {
    if (!cityName) {
        return {
            cost: emptyCost,
            source: 'missing_city_default',
            matchedCity: null,
            usedFallback: true,
        };
    }

    const match = findMatchingCity(cities, cityName);
    if (match && match.delivery_cost !== null && match.delivery_cost !== undefined) {
        return {
            cost: parseFloat(match.delivery_cost),
            source: 'city_table',
            matchedCity: match.name,
            usedFallback: false,
        };
    }

    return {
        cost: isCasaCityName(cityName) ? 25 : 35,
        source: isCasaCityName(cityName) ? 'default_casa' : 'default_outside_casa',
        matchedCity: null,
        usedFallback: true,
    };
};
