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
        const newValue = fn.apply(null, args);
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
            .then((resolvedArgs) => fn.apply(null, resolvedArgs))
            .then((newValue) => {
            values.set(dependent, newValue);
            return;
        });
        updatePromises.set(dependent, dependentPromise);
    }
    await Promise.all(updatePromises.values());
}
export default class Plex {
    constructor({ initialValue } = {}) {
        values.set(this, initialValue);
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
    static define(fn, antecedents) {
        if (antecedents.length === 0)
            return new Plex();
        const args = antecedents.map(antecedent => values.get(antecedent));
        const initialValue = fn.apply(null, args);
        const newPlex = new Plex({ initialValue });
        const determiner = { antecedents, fn };
        for (const antecedent of antecedents) {
            if (!relations.has(antecedent)) {
                relations.set(antecedent, new Map());
                immediateDependents.set(antecedent, []);
            }
            relations.get(antecedent).set(newPlex, determiner);
            immediateDependents.get(antecedent).push(newPlex);
        }
        return newPlex;
    }
    static addRelation(dependent, fn, antecedents) {
        if (antecedents.length === 0 || (antecedents.length === 1 && antecedents[0] === dependent))
            return;
        if (antecedents.some(antecedent => relations.get(antecedent)?.has(dependent)))
            return;
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
        const args = antecedents.map(antecedent => values.get(antecedent));
        const newValue = fn.apply(null, args);
        values.set(dependent, newValue);
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
}
//# sourceMappingURL=Plex.js.map