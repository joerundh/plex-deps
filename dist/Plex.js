const values = new Map();
const relations = new Map();
const immediateDependents = new Map();
function scheduleUpdates(starters) {
    const starterSet = new Set(starters);
    const scheduleSet = new Set();
    const determiners = new Map();
    let primaryQueue = starters.filter(starter => immediateDependents.has(starter));
    let secondaryQueue = [];
    while (primaryQueue.length) {
        for (const antecedent of primaryQueue) {
            if (!immediateDependents.has(antecedent))
                continue;
            for (const dependent of immediateDependents.get(antecedent)) {
                if (starterSet.has(dependent))
                    continue;
                if (scheduleSet.has(dependent)) {
                    for (const plex of determiners.get(dependent).antecedents) {
                        if (plex === antecedent) {
                            scheduleSet.delete(dependent);
                            break;
                        }
                    }
                }
                else {
                    secondaryQueue.push(dependent);
                    const determiner = relations.get(antecedent).get(dependent);
                    determiners.set(dependent, determiner);
                }
                scheduleSet.add(dependent);
            }
        }
        primaryQueue = secondaryQueue;
        secondaryQueue = [];
    }
    return { scheduleSet, determiners };
}
function assignValues(assignments) {
    for (const { assignee, newValue } of assignments) {
        values.set(assignee, newValue);
    }
    const starters = assignments.map(assignment => assignment.assignee);
    const { scheduleSet, determiners } = scheduleUpdates(starters);
    for (const dependent of scheduleSet) {
        const { fn, antecedents } = determiners.get(dependent);
        const args = antecedents.map(antecedent => values.get(antecedent));
        const newValue = fn.apply(null, args);
        values.set(dependent, newValue);
    }
}
export default class Plex {
    constructor({ initialValue } = {}) {
        values.set(this, initialValue);
    }
    get value() {
        return values.get(this);
    }
    set value(newValue) {
        assignValues([{ assignee: this, newValue }]);
    }
    assign(newValue) {
        assignValues([{ assignee: this, newValue }]);
    }
    static define(fn, antecedents) {
        if (antecedents.length === 0)
            return new Plex();
        const args = antecedents.map(antecedent => values.get(antecedent));
        const initialValue = fn.apply(null, args);
        const newPlex = new Plex({ initialValue });
        const determiner = { fn, antecedents };
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
        const determiner = { fn, antecedents };
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
}
//# sourceMappingURL=Plex.js.map