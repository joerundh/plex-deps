const values = new Map();
const relations = new Map();
const immediateDependents = new Map();
function computeOrder(starters) {
    const startersSet = new Set(starters);
    const order = new Set();
    const determiners = new Map();
    let primaryQueue = starters.filter(starter => immediateDependents.has(starter));
    let secondaryQueue = [];
    while (primaryQueue.length) {
        for (const antecedent of primaryQueue) {
            if (!immediateDependents.has(antecedent))
                continue;
            for (const dependent of immediateDependents.get(antecedent)) {
                if (startersSet.has(dependent))
                    continue;
                if (order.has(dependent)) {
                    for (const plex of determiners.get(dependent).antecedents) {
                        if (plex === antecedent) {
                            order.delete(dependent);
                            break;
                        }
                    }
                }
                else {
                    secondaryQueue.push(dependent);
                    const determiner = relations.get(antecedent).get(dependent);
                    determiners.set(dependent, determiner);
                }
                order.add(dependent);
            }
        }
        primaryQueue = secondaryQueue;
        secondaryQueue = [];
    }
    return [order, determiners];
}
function assignValues(assignments) {
    const starters = new Array(assignments.length);
    for (let i = 0; i < assignments.length; i++) {
        const [starter, newStarterValue] = assignments[i];
        starters[i] = starter;
        values.set(starter, newStarterValue);
    }
    const [order, determiners] = computeOrder(starters);
    for (const dependent of order) {
        const { antecedents, fn } = determiners.get(dependent);
        const args = antecedents.map(antecedent => values.get(antecedent));
        const newValue = fn(...args);
        values.set(dependent, newValue);
    }
}
async function assignValuesAsync(assignments) {
    const starters = new Array(assignments.length);
    const updatePromises = new Map();
    for (let i = 0; i < assignments.length; i++) {
        const [starter, newStarterValue] = assignments[i];
        starters[i] = starter;
        const starterPromise = Promise.resolve(newStarterValue)
            .then((resolvedValue) => {
            values.set(starter, resolvedValue);
            return;
        });
        updatePromises.set(starter, starterPromise);
    }
    const [order, determiners] = computeOrder(starters);
    for (const dependent of order) {
        const { antecedents, fn } = determiners.get(dependent);
        const antecedentsPromises = antecedents.map((antecedent) => Promise.resolve(updatePromises.get(antecedent) ?? values.get(antecedent)));
        const dependentPromise = Promise.all(antecedentsPromises)
            .then((resolvedArgs) => fn(...resolvedArgs))
            .then((newValue) => {
            values.set(dependent, newValue);
            return;
        });
        updatePromises.set(dependent, dependentPromise);
    }
    await Promise.all(updatePromises.values());
}
function addRelation(dependent, antecedents, fn) {
    if (antecedents.length === 0 || (antecedents.length === 1 && antecedents[0] === dependent))
        return false;
    if (antecedents.some(antecedent => relations.get(antecedent)?.has(dependent)))
        return false;
    const determiner = { antecedents, fn };
    for (const antecedent of antecedents) {
        if (antecedent === dependent)
            continue;
        if (!relations.has(antecedent)) {
            relations.set(antecedent, new Map());
            immediateDependents.set(antecedent, []);
        }
        relations.get(antecedent).set(dependent, determiner);
        immediateDependents.get(antecedent).push(dependent);
    }
    return true;
}
function createDependent(initial, antecedents, fn) {
    const newPlex = new Plex(initial);
    addRelation(newPlex, antecedents, fn);
    return newPlex;
}
export default class Plex {
    constructor(...args) {
        const initial = args.length ? args[0] : undefined;
        values.set(this, initial);
    }
    get value() {
        return values.get(this);
    }
    set value(newValue) {
        assignValues([[this, newValue]]);
    }
    assign(newValue) {
        assignValues([[this, newValue]]);
    }
    async assignAsync(newValue) {
        await assignValuesAsync([[this, newValue]]);
    }
    relate(antecedents, fn) {
        Plex.relate(this, antecedents, fn);
    }
    async relateAsync(antecedents, fn) {
        await Plex.relateAsync(this, antecedents, fn);
    }
    static assign(assignments) {
        if (assignments.length === 0)
            return;
        assignValues(assignments);
    }
    static async assignAsync(assignments) {
        if (assignments.length === 0)
            return;
        await assignValuesAsync(assignments);
    }
    static define(antecedents, fn) {
        if (antecedents.length === 0) {
            const initial = fn();
            return new Plex(initial);
        }
        const args = antecedents.map(antecedent => values.get(antecedent));
        const initial = fn(...args);
        return createDependent(initial, antecedents, fn);
    }
    static async defineAsync(antecedents, fn) {
        if (antecedents.length === 0) {
            const initial = await fn();
            return new Plex(initial);
        }
        const args = await Promise.all(antecedents.map(antecedent => values.get(antecedent)));
        const initial = await fn(...args);
        return createDependent(initial, antecedents, fn);
    }
    static relate(dependent, antecedents, fn) {
        if (!addRelation(dependent, antecedents, fn))
            return;
        const args = antecedents.map(antecedent => values.get(antecedent));
        const newValue = fn(...args);
        values.set(dependent, newValue);
    }
    static async relateAsync(dependent, antecedents, fn) {
        if (!addRelation(dependent, antecedents, fn))
            return;
        const args = await Promise.all(antecedents.map(antecedent => values.get(antecedent)));
        const newValue = await fn(...args);
        values.set(dependent, newValue);
    }
}
//# sourceMappingURL=Plex.js.map