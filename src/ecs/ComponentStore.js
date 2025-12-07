// @ts-check

import { DefaultSparseSetOptions, SparseSet } from "./SparseSet.js";

/**
 * @import {SparseSetOptions} from './SparseSet.js'
 * @import {EntityID} from './EntityHandle.js'
 */

/** @typedef {any} Component */
/** @typedef {Component[]} ComponentArray */
/** @typedef {number} ComponentType */

/**
 * @typedef {object} RawComponentData
 * @property {ComponentArray} data - The component array reference.
 * @property {number} len - Number of active components.
 */

/** @typedef {new (...args: any[]) => any} ComponentConstructor */

/** @constant FAILED_OPERATION - To mark a Failed Operation*/
const FAILED_OPERATION = -1;

/** @constant SUCCESS_OPERATION - To mark a Successful Operation*/
const SUCCESS_OPERATION = 0;

/** @constant DEFAULT_COMP_VAL Used to fill the Component Array */
const DEFAULT_COMP_VAL = null;

/** @constant  Standard Component */
export const ComponentStandard = 0b01;

/** @constant Empty Component (Used for Tag Component} */
export const ComponentEmpty = 0b10;

/**
 * @class
 * @classdesc Class Usedfor COmponent Storage in the ECS system uses Sparse Set based design
 * @author Bhaumik Talwar
 */
export class ComponentStore {

    /** @type {SparseSet} Sparse Set Used for Entities For this Component*/
    #set;

    /** @type {ComponentArray} Component Array for for the Store Pool*/
    #components;

    /** @type {ComponentConstructor} Constructor Function Used to Intantiate the Component Object */
    #compConstructor;

    /** @type {boolean} Bool to know if its a empty Component or not */
    #isEmptyComp = false;

    /**
     * Constructor Function for a Component Store
     * @param {ComponentConstructor} type Component Type (Constructor Function Used to Intantiate the Component Object)
     * @param {ComponentType} Ctype Type of the Component
     * @param {SparseSetOptions } [config] Sparse Set Options Used to Setup the Set and Pool
     * @throws {Error}
     */
    constructor(type, Ctype = ComponentStandard, config = DefaultSparseSetOptions) {
        if (!type) throw new Error("A Type for the component is required");

        if (Ctype === ComponentEmpty) {
            this.#isEmptyComp = true;
            this.#components = [];
        } else {
            this.#components = new Array(config.poolSize);
        }

        this.#compConstructor = type;
        this.#set = new SparseSet(config);
    }

    /**
     * Function to Increase the capacity of Component Pool
     * @param {number} capacity New Capacity to increase to
     * @returns {number} Status 0 for success and -1 for failure
     */
    reserve(capacity) {
        if (capacity <= this.#set.capacity()) return FAILED_OPERATION;

        this.#set.resize(capacity);
        if (!this.#isEmptyComp) {
            const start = this.#components.length;
            this.#components.length = capacity;
            this.#components.fill(DEFAULT_COMP_VAL, start);
        }

        return SUCCESS_OPERATION;
    }

    /**
     * Functio to add Component to a Entity if Entity exists then repalce it with the existing component if replace = true
     * @param {EntityID} entityID - EntityID for the entity
     * @param {any[]} [args] - Args passed to Component Constructore
     * @param {boolean} [replace] - To replace the compoment in case of the entity already existing in teh system
     * @param {boolean} [resize] - To enable the add func to auto resize the dense array ( resize will be by a factor of 2)
     * @returns {number} - returns the status of added elem in list, -1 if operation failed
     */
    add(entityID, args = [], replace = true, resize = true) {
        const existed = this.#set.contains(entityID);
        const idx = this.#set.add(entityID, resize);

        if (idx === FAILED_OPERATION) return FAILED_OPERATION;
        if (this.#isEmptyComp) return SUCCESS_OPERATION;

        if (idx >= this.#components.length) {
            if (!resize) {
                this.#set.remove(entityID);
                return FAILED_OPERATION;
            }

            const oldLen = this.#components.length;
            const newCap = Math.max(oldLen * 2, idx + 1);
            this.#components.length = newCap;
            this.#components.fill(DEFAULT_COMP_VAL, oldLen);
        }

        if (existed && !replace) {
            return SUCCESS_OPERATION;
        }

        this.#components[idx] = new this.#compConstructor(...args);

        return SUCCESS_OPERATION;

    }

    /**
     * Function to remove the Component from the from the  entity
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {number} - Gives -1 if the remove fails and 0 for success
     */
    remove(entityID) {
        const idx = this.#set.index(entityID);
        if (idx === FAILED_OPERATION) return FAILED_OPERATION;

        if (!this.#isEmptyComp) {
            const lastIdx = this.#set.len() - 1;
            if (lastIdx !== idx) {
                this.#components[idx] = this.#components[lastIdx];
            }
            this.#components[lastIdx] = null;
        }

        return this.#set.remove(entityID);

    }

    /**
     * Function to know if the entity is attacthed to this component type or not
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {boolean} - True if the entity is set false otherwise
     */
    contains(entityID) {
        return this.#set.contains(entityID);
    }

    /**
     * Function to know the length of the ComponentStore
     * @returns {number} size of compoennt array and dense list
     */
    len() {
        return this.#set.len();
    }

    /**
     * Function to get raw access to component data.
     * @returns {RawComponentData} The Raw Data Object
     * @throws {Error}
     */
    raw() {
        if (this.#isEmptyComp) {
            throw new Error("This method is not available for empty components.");
        }

        return { data: this.#components, len: this.#set.len() };
    }

    /**
     * Function to get the Component for the Entity
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    get(entityID) {
        if (this.#isEmptyComp) throw new Error("This Does not upport empty Comps");

        const idx = this.#set.index(entityID);
        if (idx === FAILED_OPERATION) throw new Error("Component Does Not Exist For this Id");

        return this.#components[idx];
    }

    /**
     * Function to get the Component for the Entity a Copy is passed
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    getConst(entityID) {
        if (this.#isEmptyComp) throw new Error("This Does not support empty Comps");

        const idx = this.#set.index(entityID);
        if (idx === FAILED_OPERATION) throw new Error("Component Does Not Exist For this Id");

        const comp = this.#components[idx];
        return Object.assign(Object.create(Object.getPrototypeOf(comp)), structuredClone(comp));
    }

    /**
     * Function to get the Component for the Entity
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    tryGet(entityID) {
        if (this.#isEmptyComp) throw new Error("This Does not upport empty Comps");

        const idx = this.#set.index(entityID);
        if (idx === FAILED_OPERATION) return null;

        return this.#components[idx];
    }

    /**
     * Function to get the Component for the Entity a Copy is passed
     * @param {EntityID} entityID - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    tryGetConst(entityID) {
        if (this.#isEmptyComp) throw new Error("This Does not support empty Comps");

        const idx = this.#set.index(entityID);
        if (idx === FAILED_OPERATION) return null;

        const comp = this.#components[idx];
        return Object.assign(Object.create(Object.getPrototypeOf(comp)), structuredClone(comp));
    }

    /**
     * Function to get the Entity list that are attached to this Component
     * @returns {Uint32Array | EntityID[]} - Entity List
     */
    data() {
        return this.#set.data();
    }

    /**
     * Function to Swap out two enties and their Components
     * @param {EntityID} ent1 EntityID for the first entity
     * @param {EntityID} ent2 EntityID for the seecond entity
     * @param {boolean} [insatancesOnly] - To waether to swap Component only
     * @returns {number} Status weather the swap was successful or not
     */
    swap(ent1, ent2, insatancesOnly = false) {
        if (ent1 === ent2) return FAILED_OPERATION;

        const idx1 = this.#set.index(ent1);
        const idx2 = this.#set.index(ent2);

        if (idx1 === FAILED_OPERATION || idx2 === FAILED_OPERATION) {
            return FAILED_OPERATION;
        }

        if (!this.#isEmptyComp) {
            const temp = this.#components[idx1];
            this.#components[idx1] = this.#components[idx2];
            this.#components[idx2] = temp;
        }

        if (!insatancesOnly) {
            if (this.#set.swap(ent1, ent2) === FAILED_OPERATION) {
                return FAILED_OPERATION;
            }
        }

        return SUCCESS_OPERATION;
    }

    /**
     * Function to Sort the Component Store for EmptyComponent Types only
     * Expects same signature and behaviour as comparator func passed to Array.Ssort
     * @param {(a:EntityID, b:EntityID) => number} comparatorFunc - Function to compare and sort the dense array
     * @returns {number} weather the operaions is succes or faileed
     * @throws {Error}
     */
    sortEmpty(comparatorFunc) {
        if (!this.#isEmptyComp) throw new Error("Method only for ComponentEmpty Type");

        return this.#set.sort(comparatorFunc);
    }

    /**
     * Function to Sort the Component Store based on comparator function that based on component alone
     * Expects same signature and behaviour as comparator func passed to Array.Ssort
     * @param {(a:Component, b:Component) => number} comparatorFunc - Function to compare and sort the dense array
     * @returns {number} weather the operaions is succes or faileed
     * @throws {Error}
     */
    sortBasedComponent(comparatorFunc) {
        if (this.#isEmptyComp) throw new Error("Method only for ComponentEmpty Type");
        if (this.len() <= 1) return FAILED_OPERATION;

        const denseArr = this.#set.data();
        const compArr = this.#components;
        let temp = null;

        for (let i = 1; i < this.len(); i++) {
            for (let j = i; j > 0 && (comparatorFunc(compArr[j], compArr[j - 1]) < 0); j--) {
                temp = compArr[j];
                compArr[j] = compArr[j - 1];
                compArr[j - 1] = temp;

                this.#set.swap(denseArr[j], denseArr[j - 1]);
            }
        }

        return SUCCESS_OPERATION;
    }

}
