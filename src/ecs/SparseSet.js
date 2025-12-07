// @ts-check

import { EntityHandleMedium } from "./EntityHandle";

/**
 * @import {EntityID} from './EntityHandle.js'
 * @import {EntityHandle} from './EntityHandle.js'
 */

/** @constant TOMBSTONE - To mark the Sparse Array elem to not contain enty in dense array */
const TOMBSTONE = -1;

/** @constant FAILED_OPERATION - To mark a Failed Operation*/
const FAILED_OPERATION = -1;

/** @constant SUCCESS_OPERATION - To mark a Successful Operation*/
const SUCCESS_OPERATION = 0;

/** @constant DEFAULT_DENSE_VAL Default Value to be used for Dense Array (in case of untyped) */
const DEFAULT_DENSE_VAL = Infinity;

/**
 * @typedef {object} SparseSetOptions
 * @property {boolean} [typedArray=true] - Whether to use Typed Array for dense list or not
 * @property {number} [poolSize=1024] - Pool size for typed arrays
 * @property {number} [pageSize=4096] - Page size for each page of the sparse array (Assumed to be always power of 2)
 * @property {EntityHandle} [entityHandler = EntityHandleMedium] - Entity Handler object helper
 */

/** @constant DefaultSparseSetOptnions - The Default Options used to Configure Sparse Set */
export const DefaultSparseSetOptions = {
    typedArray: true,
    poolSize: 1024,
    pageSize: 4096,
    entityHandler: EntityHandleMedium,
};

/**
 * @class
 * @classdesc Sparse Set Implementation
 * @author Bhaumik Talwar
 */
export class SparseSet {

    /** @type {number} - Page Size for the Sparse Array */
    #pageSize = 4096;

    /** @type {number[][]} - Sparse Array */
    #sparse = new Array();

    /** @type {Uint32Array | EntityID[]} - Dense or Packed Array */
    #dense;

    /** @type {number} - Length of the dense list */
    #length = 0;

    /** @type {boolean} -If its a typed array for dense array or not */
    #typedArray = true;

    /**
     * Constructor function to create out a Sparse Set Object
     * @param {SparseSetOptions} [config] - Options to configure sparse set
     */
    constructor(config = DefaultSparseSetOptions) {
        if (!config.pageSize || (config.pageSize & (config.pageSize - 1)) !== 0) throw new Error("pageSize must be a power of 2");
        if (config.pageSize < 128) throw new Error("pageSize must be at least 128");
        if (config.typedArray == null ||
            config.entityHandler == null ||
            config.poolSize == null) {
            throw new Error("Incorrect Config Passed");
        }

        this.#pageSize = config.pageSize;
        this.entityHandler = config.entityHandler;
        this.#dense = config.typedArray ? new Uint32Array(config.poolSize) : new Array(config.poolSize).fill(DEFAULT_DENSE_VAL);
        this.#typedArray = config.typedArray;
    }

    /**
     * Function to convert the entity id to pageIndex
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {number} - Page Index For the Sparse Set
     */
    pageIndex(entityID) {
        return Math.floor(this.entityHandler.index(entityID) / this.#pageSize);
    }

    /**
     * Function to get the offset of the entity in the page
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {number} - Page offset For the Sparse Set
     */
    pageOffset(entityID) {
        return this.entityHandler.index(entityID) & (this.#pageSize - 1);
    }

    /**
     * Function to get an existing page with the
     * @param {number} pageIndex - page Index in the sparse array
     * @returns {number[]} - Page of teh sparse array
     */
    getOrCreatePage(pageIndex) {
        if (!this.#sparse[pageIndex]) {
            this.#sparse[pageIndex] = [];
        }

        return this.#sparse[pageIndex];
    }

    /**
     * Function To get the capacity of the dense array
     * @returns {number} - Capacity of teh dense list (Capacity if typed array and Infinity if dynamic array)
     */
    capacity() {
        return this.#dense.length;
    }

    /**
     * Function To reset the dense array
     */
    reset() {
        this.#length = 0;
    }

    /**
     * Function to clear the sparse set both sparse and dense arrays
     */
    clear() {
        this.#length = 0;
        this.#sparse = new Array();
    }

    /**
     * Function to increase the size of the sparse set- Will be costly eitherways so use wisely.
     * @param {number} capacity - to resize the capacity of the dense array of sparse set
     * @returns {number} operation status 0 for success, -1 for failure
     */
    resize(capacity) {
        if (capacity <= this.capacity()) return FAILED_OPERATION;

        if (this.#typedArray && this.#dense instanceof Uint32Array) {
            const bigger = new Uint32Array(capacity);
            bigger.set(this.#dense);
            this.#dense = bigger;
            return SUCCESS_OPERATION;
        }

        /** @type {EntityID[]} */
        const denseArr = /** @type {EntityID[]} */ (this.#dense);

        const start = denseArr.length;
        denseArr.length = capacity;
        denseArr.fill(DEFAULT_DENSE_VAL, start);

        return SUCCESS_OPERATION;
    }

    /**
     * Functio to get the length of the dense list
     * @returns {number} - Length
     */
    len() {
        return this.#length;
    }

    /**
     * Function to get the dense list of the sparse set
     * @returns {Uint32Array | EntityID[]} - Dense list
     */
    data() {
        return this.#dense;
    }

    /**
     * Generator func to be used a iterator in loops;
     * @yields {EntityID}
     */
    *entities() {
        for (let i = 0; i < this.#length; i++) {
            yield this.#dense[i];
        }
    }

    /**
     * Function to know if a Entity is set in teh sparse set or not
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {boolean} - True if the entity is set in sparse set false otherwise
     */
    contains(entityID) {
        const pageIndex = this.pageIndex(entityID);
        const page = this.#sparse[pageIndex];
        if (!page) return false;

        const denseIdx = page[this.pageOffset(entityID)];
        return denseIdx !== undefined && denseIdx !== TOMBSTONE && denseIdx < this.#length;

    }

    /**
     * Function to get the Index of the entity in dense list if its set
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {number} - Index in dense list if it exist -1 otherwise
     */
    index(entityID) {
        const pageIndex = this.pageIndex(entityID);
        const page = this.#sparse[pageIndex];
        if (!page) return FAILED_OPERATION;

        const denseIdx = page[this.pageOffset(entityID)];
        if (denseIdx !== undefined && denseIdx !== TOMBSTONE && denseIdx < this.#length) {
            return denseIdx;
        }

        return FAILED_OPERATION;

    }

    /**
     * Functio to add entity to sparse set if the entity exist we return its index
     * @param {EntityID} entityID - EntityID for the entity
     * @param {boolean} [resize] - To enable the add func to auto resize the dense array ( resize will be by a factor of 2)
     * @returns {number} - returns the Index of added elem in dense list, -1 if operation failed
     */
    add(entityID, resize = false) {
        if (this.contains(entityID)) {
            return this.index(entityID);
        }

        const denseIndex = this.#length;

        if (denseIndex >= this.capacity()) {
            if (!resize) return FAILED_OPERATION;

            const status = this.resize(denseIndex * 2);
            if (status === FAILED_OPERATION) return FAILED_OPERATION;
        }

        const pageIndex = this.pageIndex(entityID);
        const page = this.getOrCreatePage(pageIndex);
        const pageOffset = this.pageOffset(entityID);

        page[pageOffset] = denseIndex;
        this.#dense[denseIndex] = entityID;
        this.#length += 1;

        return denseIndex;
    }

    /**
     * Function to remove a entity from Sparse Set
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {number} - Gives -1 if the remove fails and 0 for success
     */
    remove(entityID) {
        if (this.#length === 0) {
            return FAILED_OPERATION;
        }

        const pageIndex = this.pageIndex(entityID);
        const page = this.#sparse[pageIndex];
        if (!page) return FAILED_OPERATION;

        const pageOffset = this.pageOffset(entityID);
        const denseIdx = page[pageOffset];
        if (denseIdx === undefined || denseIdx === TOMBSTONE) {
            return FAILED_OPERATION;
        }

        const lastDenseIdx = this.#length - 1;
        const lastDenseEntity = this.#dense[lastDenseIdx];

        if (denseIdx !== lastDenseIdx) {
            this.#dense[denseIdx] = lastDenseEntity;

            const lastPageIndex = this.pageIndex(lastDenseEntity);
            const lastPageOffset = this.pageOffset(lastDenseEntity);

            this.#sparse[lastPageIndex][lastPageOffset] = denseIdx;
        }

        page[pageOffset] = TOMBSTONE;
        this.#length -= 1;

        return SUCCESS_OPERATION;
    }

    /**
     * Function to swap two entities in the sparse set
     * @param {EntityID} ent1 - EntityID for the entity 1
     * @param {EntityID} ent2 - EntityID for the entity 2
     * @returns {number} weather the operaions is succes or faileed
     */
    swap(ent1, ent2) {
        if (this.#length === 0 || ent1 === ent2) {
            return FAILED_OPERATION;
        }

        let pageIndex = this.pageIndex(ent1);
        const page1 = this.#sparse[pageIndex];
        if (!page1) return FAILED_OPERATION;

        pageIndex = this.pageIndex(ent2);
        const page2 = this.#sparse[pageIndex];
        if (!page2) return FAILED_OPERATION;

        const pageOffset1 = this.pageOffset(ent1);
        const denseIdx1 = page1[pageOffset1];
        if (denseIdx1 === undefined || denseIdx1 === TOMBSTONE) {
            return FAILED_OPERATION;
        }

        const pageOffset2 = this.pageOffset(ent2);
        const denseIdx2 = page2[pageOffset2];
        if (denseIdx2 === undefined || denseIdx2 === TOMBSTONE) {
            return FAILED_OPERATION;
        }

        if (denseIdx1 < 0 || denseIdx1 >= this.#length || denseIdx2 < 0 || denseIdx2 >= this.#length) {
            return FAILED_OPERATION;
        }

        let temp = this.#dense[denseIdx1];
        this.#dense[denseIdx1] = this.#dense[denseIdx2];
        this.#dense[denseIdx2] = temp;

        temp = denseIdx1;
        page1[pageOffset1] = denseIdx2;
        page2[pageOffset2] = temp;

        return SUCCESS_OPERATION;

    }

    /**
     * Function to Sort a Sparse set dense array based on a comparator function
     * Expects same signature and behaviour as comparator func passed to Array.Ssort
     * @param {(a:EntityID, b:EntityID) => number} comparatorFunc - Function to compare and sort the dense array
     * @returns {number} weather the operaions is succes or faileed
     */
    sort(comparatorFunc) {
        this.#dense.sort(comparatorFunc);

        for (let i = 0; i < this.#length; i++) {
            const entity = this.#dense[i];
            this.#sparse[this.pageIndex(entity)][this.pageOffset(entity)] = i;
        }

        return SUCCESS_OPERATION;
    }

}
