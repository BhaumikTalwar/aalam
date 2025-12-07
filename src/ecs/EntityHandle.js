// @ts-check

/** @typedef {number | bigint} EntityID */

/**
 * @typedef {object} EntityHandleNumber
 * @property {(index: number, version: number) => EntityID} make - Encodes an entity index and version into a single Number.
 * @property {(id: EntityID) => number} index - Extracts the index portion from the encoded entity ID.
 * @property {(id: EntityID) => number} version - Extracts the version portion from the encoded entity ID.
 * @property {(a: EntityID, b: EntityID) => boolean} equals - Compares two entity IDs for equality.
 * @property {{indexBits: number, versionBits: number, totalBits: number, type: EntityType}} bits - Metadata about bit allocation and type.
 */

/**
 * @typedef {object} EntityHandleBigInt
 * @property {(index: number, version: number) => EntityID} make - Encodes an entity index and version into a single BigInt.
 * @property {(id: EntityID) => number} index - Extracts the index portion from the encoded BigInt entity ID.
 * @property {(id: EntityID) => number} version - Extracts the version portion from the encoded BigInt entity ID.
 * @property {(a: EntityID, b: EntityID) => boolean} equals - Compares two entity IDs for equality.
 * @property {{indexBits: number, versionBits: number, totalBits: number, type: EntityType}} bits - Metadata about bit allocation and type.
 */

/** @typedef {EntityHandleNumber | EntityHandleBigInt} EntityHandle */
/** @typedef {number} EntityType */
/** @typedef {{Number: EntityType, BigInt: EntityType}} EntityTypeEnum */

/** @type {EntityTypeEnum} Enum To check the Entity Type weather number or big int */
export const EntityType = Object.freeze({
    Number: 0x01,
    BigInt: 0x10,
});

/**
 * Create an EntityHandle utility for custom bit layouts.
 * Supports Number (≤32 bits) or BigInt (>32 bits) IDs.
 * @param {number} indexBits - Bits required for the index part of the entity
 * @param {number} versionBits - Bits required for the version part of the entity
 * @throws {Error} If indexBits or versionBits are non-positive
 * @returns {EntityHandle} Returns an object with make/index/version/equals/bits
 */
export function EntityHandleFactory(indexBits, versionBits) {
    const totalBits = indexBits + versionBits;

    if (totalBits > 64) {
        throw new Error("Cant have Entities bigger than 64 bits");
    }

    if (indexBits <= 0 || versionBits <= 0) {
        throw new Error("indexBits and versionBits must be positive");
    }

    if (totalBits > 32) {
        const indexMask = (1n << BigInt(indexBits)) - 1n;
        const versionMask = (1n << BigInt(versionBits)) - 1n;

        /** @type {EntityHandleBigInt} */
        const handler = {
            make: (index, version) => {
                return ((BigInt(index) & indexMask) << BigInt(versionBits)) |
                    (BigInt(version) & versionMask);
            },
            index: (id) => {
                const n = /** @type {bigint} */ (id);
                return Number((n >> BigInt(versionBits)) & indexMask);
            },
            version: (id) => {
                const n = /** @type {bigint} */ (id);
                return Number(n & versionMask);
            },
            equals: (a, b) => a === b,
            bits: { indexBits, versionBits, totalBits, type: EntityType.BigInt },
        };
        return handler;
    } else {
        const indexMask = (1 << indexBits) - 1;
        const versionMask = (1 << versionBits) - 1;

        /** @type {EntityHandleNumber} */
        const handler = {
            make: (index, version) => {
                return ((index & indexMask) << versionBits) | (version & versionMask);
            },
            index: (id) => {
                const n = /** @type {number} */ (id);
                return (n >>> versionBits) & indexMask;
            },
            version: (id) => {
                const n = /** @type {number} */ (id);
                return n & versionMask;
            },
            equals: (a, b) => a === b,
            bits: { indexBits, versionBits, totalBits, type: EntityType.Number },
        };
        return handler;
    }
}

export const EntityHandleSmall = EntityHandleFactory(12, 4);
export const EntityHandleMedium = EntityHandleFactory(20, 12);
export const EntityHandleLarge = EntityHandleFactory(32, 32);
