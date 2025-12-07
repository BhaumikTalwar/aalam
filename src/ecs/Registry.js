// @ts-check

import { EntityStore, DefaultEntityStoreOptions } from "./EntityStore.js";
import { ComponentStandard, ComponentStore } from "./ComponentStore.js";
import { DefaultSparseSetOptions } from "./SparseSet.js";

/** @import {Component,ComponentConstructor, ComponentType, RawComponentData} from './ComponentStore.js' */
/** @import {EntityStoreOptions, EntityStoreIterator} from './EntityStore.js' */
/** @import {EntityID} from './EntityHandle.js' */
/** @import {SparseSetOptions} from './SparseSet.js' */

/**
 * @typedef {EntityStoreOptions} EntityOptions
 */

/**
 * @typedef {object} ComponentOptions
 * @property {boolean} [typedArray=true] - Whether to use Typed Array for dense list or not
 * @property {number} [poolSize=1024] - Pool size for typed arrays
 * @property {number} [pageSize=4096] - Page size for each page of the sparse array (Assumed to be always power of 2)
 * @property {boolean} [replace=true] - Weather to replace the component at time of adding a comp to an aleardy exixting comp of a n entity
 * @property {boolean} [resize=true] - Weather to resize the comp store at time of adding new comp
 */

/**
 * @typedef {object} RegistryOptions
 * @property {EntityOptions} entityOptions THe config for the management of entities
 * @property {ComponentOptions} componentOptions The options to control the components and their storage and realated params
 */

/** @constant DefaultRegistryOptions - The default Registry config options to use for the registry management  */
export const DefaultRegistryOptions = {
    entityOptions: DefaultEntityStoreOptions,
    componentOptions: {
        typedArray: DefaultSparseSetOptions.typedArray,
        poolSize: DefaultSparseSetOptions.poolSize,
        pageSize: DefaultSparseSetOptions.pageSize,
        replace: true,
        resize: true,
    },
};

export const SENTINEL = -1;

/**
 * @class
 * @classdesc The main class for the ecs system
 * @author Bhaumik Talwar
 */
export class Registry {
    /** @type {EntityStore} */
    #entities;

    /** @type {Map<ComponentConstructor, ComponentStore>} */
    #components = new Map();

    /** @type {RegistryOptions} [DefaultRegistyOptions] The Configurations Options to use for registry */
    #config;

    /**
     * Constructor to Createa registry
     * @param {RegistryOptions} [config] configuration for registry
     * @throws {Error}
     */
    constructor(config = DefaultRegistryOptions) {
        if (config.entityOptions == null || config.componentOptions == null) {
            throw new Error("Improper Config");
        }

        this.#config = config;
        this.#entities = new EntityStore(config.entityOptions);
    }

    /**
     * Function to assure a component type is registerd or not
     * if not register it and return the ref to CompStore
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {ComponentType} CType Type of the Component
     * @param {ComponentOptions} [config] the config for the component store
     * @returns {ComponentStore} The component store ref
     */
    prepare(comp, CType = ComponentStandard, config = this.#config.componentOptions) {
        let compStore = this.#components.get(comp);
        if (compStore !== undefined) return compStore;

        compStore = new ComponentStore(comp, CType, getCompConfig(
            {
                entityOptions: this.#config.entityOptions,
                componentOptions: config,
            }),
        );

        this.#components.set(comp, compStore);

        return compStore;
    }

    /**
     * The len for the the component store registerd
     * If compstore for the CompTYPe doesnt exixist then returns a sentinel value
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {number} The len of compstore elems or SENTINEL if comp does not exixt
     */
    len(comp) {
        const compStore = this.#components.get(comp);
        return (compStore !== undefined) ? compStore.len() : SENTINEL;
    }

    /**
     * Function to increase the capacity of Component Pool
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {number} cap New Capacity to increase to
     * @returns {number} Status 0 if success and Sentinel value (-1) for failure or if comp does not exist
     */
    reserve(comp, cap) {
        const compStore = this.#components.get(comp);
        return (compStore !== undefined) ? compStore.reserve(cap) : SENTINEL;
    }

    /**
     * Function to get the raw access to the comp store data
     * IT will trhow an error if the ComponennetType is Empty
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {RawComponentData} The Raw Data Object
     * @throws {Error}
     */
    raw(comp) {
        const compStore = this.#components.get(comp);
        if (compStore !== undefined) return compStore.raw();
        throw new Error("CompStore dos not exixt");
    }

    /**
     * Function to get the Entity list that are attached to this Component
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {Uint32Array | EntityID[]} - Entity List
     * @throws {Error}
     */
    data(comp) {
        const compStore = this.#components.get(comp);
        if (compStore !== undefined) return compStore.data();
        throw new Error("CompStore dos not exixt");
    }

    /**
     * To check id the Entity is alive or not
     * @param {EntityID} entity To check if the entity is correct or not
     * @returns {boolean} True if the entity is alive
     */
    valid(entity) {
        return this.#entities.isAlive(entity);
    }

    /**
     * To create a entity in the Entity Store
     * @returns {EntityID} The new created available entity in the store
     * @throws {Error} - Out Of Active Handles
     */
    create() {
        return this.#entities.create();
    }

    /**
     * To remove the entity from all the components and remove it from the EntityStore
     * @param {EntityID} entity To check if the entity is correct or not
     */
    destroy(entity) {
        if (!this.valid(entity)) return;
        this.removeAll(entity);
        this.#entities.remove(entity);
    }

    /**
     * To get the Iterator to all the active entities
     * @returns {EntityStoreIterator} iterator
     */
    entities() {
        return this.#entities.Iterator();
    }

    /**
     * Function to add a component to a entity
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {ComponentType} CType Type of the Component
     * @param {any[]} [args] - Args passed to Component Constructore
     * @param {ComponentOptions} config The config to customize the comp store creation and usage in the
     * @returns {number} - returns the status of added elem in list, -1 if operation failed
     * @throws {Error}
     */
    add(
        entity,
        comp,
        CType = ComponentStandard,
        args = [],
        config = DefaultRegistryOptions.componentOptions,
    ) {

        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity Does not exixt");
        }

        const compStore = this.prepare(comp, CType, config);
        return compStore.add(
            entity,
            args,
            config?.replace ?? DefaultRegistryOptions.componentOptions.replace,
            config?.resize ?? DefaultRegistryOptions.componentOptions.resize,
        );
    }

    /**
     * A function to add multiple componnet to a entity
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {any[]} comps The component objects arrays for adding composnt to a entity
     * @throws {Error}
     */
    addComps(entity, comps = []) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        for (const item of comps) {
            if (!Array.isArray(item)) {
                throw new Error(`Invalid component entry in 'comps': ${JSON.stringify(item)}`);
            }

            const [
                comp,
                CType = ComponentStandard,
                args = [],
                config = DefaultRegistryOptions.componentOptions,
            ] = item;

            this.add(entity, comp, CType, args, config);
        }
    }

    /**
     * A function to replace the component if it exists for an entity
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {any[]} [args] - Args passed to Component Constructore
     * @returns {number} - returns the status of added elem in list, -1 if operation failed
     * @throws {Error}
     */
    replace(entity, comp, args = []) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        if (!compStore.contains(entity)) throw new Error("No such entity is registerd for comp");

        return compStore.add(entity, args, true, true);
    }

    /**
     * A function to fetch and replace the comp value
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {any[]} [args] - Args passed to Component Constructore
     * @returns {Component} - Returns the object that we fetched
     * @throws {Error}
     */
    fetchReplace(entity, comp, args = []) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        if (!compStore.contains(entity)) throw new Error("No such entity is registerd for comp");

        const oldComp = compStore.get(entity);
        compStore.add(entity, args, true, true);

        return oldComp;
    }

    /**
     * Removes given entity from a compoent
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {number} Success - 0, -1 for Failure
     * @throws {Error}
     */
    remove(entity, comp) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.remove(entity);
    }

    /**
     * Removes given entity from a compoent if it exists
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {number} Success - 0, -1 for Failure
     * @throws {Error}
     */
    removeIfExist(entity, comp) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) return SENTINEL;

        if (!compStore.contains(entity)) return SENTINEL;
        return compStore.remove(entity);
    }

    /**
     * To remove all components from an Entity and make it orphan
     * @param {EntityID} entity To check if the entity is correct or not
     * @throws {Error}
     */
    removeAll(entity) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        for (const compStore of this.#components.values()) {
            if (!compStore.contains(entity)) continue;
            compStore.remove(entity);
        }
    }

    /**
     * Function to see if a entity has a compoennet or not
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {boolean} - True if the entity is set false otherwise
     * @throws {Error}
     */
    has(entity, comp) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.contains(entity);
    }

    /**
     * Function to get the Component for the Entity
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    get(entity, comp) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.get(entity);
    }

    /**
     * Function to get the Component for the Entity (Constant a neew Object)
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    getConst(entity, comp) {
        if (!this.#entities.isAlive(entity)) {
            throw new Error("Entity does not exist");
        }

        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.getConst(entity);
    }

    /**
     * Function to get the Component for the Entity
     * @param {EntityID} entity To check if the entity is correct or not
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {Component} - Component Associated witrh the Entity
     * @throws {Error}
     */
    tryGet(entity, comp) {
        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.tryGet(entity);
    }

    /**
     * Function to get the Component for the Entity a Copy is passed
     * @param {EntityID} entity - EntityID for the entity
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @returns {Component}- Component Associated witrh the Entity
     * @throws {Error}
     */
    tryGetConst(entity, comp) {
        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.tryGetConst(entity);
    }

    /**
     * Function to Sort the Component Store based on comparator function that based on component alone
     * Expects same signature and behaviour as comparator func passed to Array.Ssort
     * @param {ComponentConstructor} comp The component type Costrutor to identify the comp
     * @param {(a:Component, b:Component) => number} comparatorFunc - Function to compare and sort the dense array
     * @returns {number} weather the operaions is succes or faileed
     * @throws {Error}
     */
    sort(comp, comparatorFunc) {
        const compStore = this.#components.get(comp);
        if (compStore === undefined) throw new Error("no such component registerd");

        return compStore.sortBasedComponent(comparatorFunc);
    }

}

/**
 * Helper function to get a CompStoreConfig based on registry config
 * @param {RegistryOptions} regConfig the registry config
 * @returns {SparseSetOptions} the sparse set options to use for config
 */
function getCompConfig(regConfig) {
    return {
        entityHandler: regConfig.entityOptions.handler,
        pageSize: regConfig.componentOptions.pageSize,
        poolSize: regConfig.componentOptions.poolSize,
        typedArray: regConfig.componentOptions.typedArray,
    };
}
