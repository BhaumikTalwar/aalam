// @ts-check

import { ComponentStore } from "./ComponentStore.js";

/**
 * @import {Component ,RawComponentData, CompStoreIterator} from "./ComponentStore.js"
 * @import {EntityID} from './EntityHandle.js'
 * @import {SparseSetIterator} from "./SparseSet.js"
 */

/**
 * @class
 * @classdesc Class used for creatibng a Basic Single item view
 * @author Bhaumik Talwar
 */
export class BasicView {

    /** @type {ComponentStore} */
    #compStore;

    /**
     * Constructor for the BAsic View
     * @param {ComponentStore} store Comp Store for the COmp type
     */
    constructor(store) {
        if (store == null) throw new Error("Store is Null");
        this.#compStore = store;
    }

    /**
     * Function to know the length of the ComponentStore View
     * @returns {number} size of compoennt array
     */
    len() {
        return this.#compStore.len();
    }

    /**
     * Function to get raw access to component data.
     * @returns {RawComponentData} The Raw Data Object
     * @throws {Error}
     */
    raw() {
        return this.#compStore.raw();
    }

    /**
     * Function to get the Entity list that are attached to this Component
     * @returns {Uint32Array | EntityID[]} - Entity List
     */
    data() {
        return this.#compStore.data();
    }

    /**
     * Function to get the Component for the Entity
     * @param {EntityID} entity - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    get(entity) {
        return this.#compStore.get(entity);
    }

    /**
     * Function to get the Component for the Entity a Copy is passed
     * @param {EntityID} entity - EntityID for the entity
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    getConst(entity) {
        return this.#compStore.getConst(entity);
    }

    /**
     * Iterator to Component Store
     * @returns {CompStoreIterator} The iterator to the store
     */
    iterator() {
        return this.#compStore.Iterator();
    }

    /**
     * Reverse Iterator to Component Store
     * @returns {CompStoreIterator} The iterator to the store
     */
    reverseIterator() {
        return this.#compStore.ReverseIterator();
    }

    /**
     * Iterator to Entities in the sparse Set
     * @returns {SparseSetIterator} the iterator to the sparse set
     */
    entityIterator() {
        return this.#compStore.entityItrerator();
    }
}
