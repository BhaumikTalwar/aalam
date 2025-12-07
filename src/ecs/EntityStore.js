// @ts-check

import { EntityHandleMedium, EntityType } from "./EntityHandle";

/**
 * @import {EntityHandle, EntityID} from './EntityHandle.js'
 */

/** @type {number} DEFAULT ENITY value */
const DEFAULT_ENTITY_VALUE = 0;

/** @type {number} Sentinel value for free_slot */
const IDX_SENTINEL = -1;

/**
 * @typedef {object} EntityStoreIterator
 * @property {number} index The current index
 * @property {EntityStore} self The Current Store refrence
 * @property {() => EntityID | null} next To get the next item in the store
 * @property {() => void} reset To reset teh iterator
 */

/**
 * @typedef {object} EntityStoreOptions
 * @property {EntityHandle} [handler = EntityHandleMedium] Entity Handler to govern what type of the entity is it
 * @property {number}  [capacity = 1000] Capacity for the Entity Store
 * @property {boolean} [resizable = true] Weather the store can grow dynamically or not
 * @property {boolean} [isTyped = true] Weather the arrays used are typed or not
 */

/** @constant {EntityStoreOptions} DefaultEntityStoreOptions - The default options to configure the Entity Store */
export const DefaultEntityStoreOptions = {
    handler: EntityHandleMedium,
    capacity: 1000,
    resizable: true,
    isTyped: true,
};


/**
 * @class
 * @classdesc EntityStore is the class to store the entities of the ecs engine
 * @author Bhaumik Talwar
 */
export class EntityStore {

    /** @type {Uint32Array | BigUint64Array | EntityID[]} Actual entities in the system*/
    #entities;

    /** @type {EntityHandle}  Handler for that particular type of entity */
    #entityHandler;

    /** @type {number} position to append the nxt entity thas created (if no freed) */
    #append_index = 0;

    /** @type {number} Head of the linked list of the entities whihc are freed */
    #free_slot = -1;

    /** @type {number | bigint} Invalid idx that is used to keep bounds according to the Entity Handler (Index bits used)*/
    #INVALID_IDX;

    /** @type {number} Length of the array */
    #cap = 0;

    /** @type {boolean} To know if its a typed array or not */
    #isTypedArray = true;

    /** @type {boolean} Weather the store can grow dynamically or not */
    #resizable = true;


    /**
     * Construction function for the Entity Store
     * @param {EntityStoreOptions} [config] Entity Handler to govern what type of the entity is it
     */
    constructor(config = DefaultEntityStoreOptions) {
        if (config.handler == null) throw new Error("Entity Handler missing");
        if (config.capacity == null || config.capacity <= 0) { config.capacity = DefaultEntityStoreOptions.capacity; }
        if (config.resizable == null) { config.resizable = DefaultEntityStoreOptions.resizable; }
        if (config.isTyped == null) { config.isTyped = DefaultEntityStoreOptions.isTyped; }

        this.#entityHandler = config.handler;
        this.#isTypedArray = config.isTyped;
        this.#resizable = config.resizable;
        this.#cap = config.capacity;

        if (config.capacity <= 0) config.capacity = 1000;

        this.#INVALID_IDX = (config.handler.bits.type === EntityType.Number) ?
            ((1 << config.handler.bits.indexBits) - 1) :
            BigInt(2) ** BigInt(config.handler.bits.indexBits) - BigInt(1);

        if (config.isTyped) {
            this.#entities = (config.handler.bits.type === EntityType.Number) ?
                new Uint32Array(config.capacity) : new BigUint64Array(config.capacity);
        } else {
            this.#entities = new Array(config.capacity).fill(DEFAULT_ENTITY_VALUE);
        }

    }

    /**
     * To create a entity in the Entity Store
     * @returns {EntityID} The new created available entity in the store
     * @throws {Error} - Out Of Active Handles
     */
    create() {
        if (this.#free_slot !== IDX_SENTINEL) {
            const ent = this.#entities[this.#free_slot];

            const version = this.#entityHandler.version(ent);
            const next_free_idx = this.#entityHandler.index(ent);

            const newEnt = this.#entityHandler.make(this.#free_slot, version);
            this.#entities[this.#free_slot] = newEnt;

            this.#free_slot = next_free_idx;
            return newEnt;
        }

        if (this.#append_index === this.#INVALID_IDX) throw new Error("Out Of Handles");

        if (this.#append_index === this.#cap - 1) {
            if (!this.#resizable) throw new Error("Limit reached Cant Resize ");

            if (this.#isTypedArray) {
                const newArr = (this.#entityHandler.bits.type === EntityType.Number) ?
                    new Uint32Array(this.#cap * 2) :
                    new BigUint64Array(this.#cap * 2);

                newArr.set(this.#entities);
                this.#entities = newArr;

            } else {
                /** @type {EntityID[]} */
                const entArr = /** @type {EntityID[]} */ (this.#entities);

                const start = entArr.length;
                entArr.length = this.#cap * 2;
                entArr.fill(this.#INVALID_IDX, start);
            }

            this.#cap = this.#cap * 2;
        }

        const entity = this.#entityHandler.make(this.#append_index, 0);
        this.#entities[this.#append_index] = entity;

        this.#append_index += 1;
        return entity;

    }

    /**
     * To check id the Entity is alive or not
     * @param {EntityID} entity To check if the entity is correct or not
     * @returns {boolean} True if the entity is alive
     */
    isAlive(entity) {
        const index = this.#entityHandler.index(entity);
        return index < this.#append_index && this.#entities[index] === entity;
    }

    /**
     * The entity to remove from the Entity Store
     * @param {EntityID} entity The entity to remove
     * @throws {Error} if entity is not present
     */
    remove(entity) {
        if (!this.isAlive(entity)) throw new Error("Invalid Handle to remove");

        const index = this.#entityHandler.index(entity);
        const version = this.#entityHandler.version(entity);

        this.#entities[index] = this.#entityHandler.make(this.#free_slot, version + 1);
        this.#free_slot = index;
    }

    /**
     * To get the Iterator to the Store
     * @returns {EntityStoreIterator} iterator
     */
    Iterator() {
        return {
            index: 0,
            self: this,

            /**
             * The next entity in the list
             * @returns {EntityID | null} The next Entity
             */
            next() {
                if (this.index >= this.self.#append_index) return null;

                let ent = null;
                for (let i = this.index; i < this.self.#append_index; i++) {
                    this.index += 1;
                    ent = this.self.#entities[i];

                    if (this.self.isAlive(ent)) {
                        return ent;
                    }
                }

                return null;
            },

            /**
             * To reset the Iterator
             */
            reset() {
                this.index = 0;
            },
        };
    }
}
