function toCamelCase(str) {
    if (!str) return str;
    return str.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
}

// Recursively converts keys of an object or array of objects to camelCase
function keysToCamel(obj) {
    // Check for primitives, null, or Date objects first
    if (typeof obj !== 'object' || obj === null || obj instanceof Date) {
        return obj; // Return primitives, null, and Date objects as is
    }

    if (Array.isArray(obj)) {
        // If it's an array, map over its elements
        return obj.map(keysToCamel);
    }

    // If it's a plain object, reduce its keys
    // (Added check to be safer with potential complex objects, though Date is handled above)
    if (obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = toCamelCase(key);
            // Recursively convert the value
            acc[camelKey] = keysToCamel(obj[key]);
            return acc;
        }, {});
    }

    // If it's some other kind of object we don't handle, return as is
    return obj;
}

module.exports = { keysToCamel };