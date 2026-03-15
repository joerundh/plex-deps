type RelationFn = (...args: any[]) => any;
type Determiner = { fn: RelationFn, antecedents: Plex[] }
type Schedule = { scheduleSet: Set<Plex>, determiners: Map<Plex, Determiner> };
type PlexArgs = { initialValue?: any };
type Assignment = { assignee: Plex, newValue: any };

const values: Map<Plex, any> = new Map<Plex, any>();
const relations: Map<Plex, Map<Plex, Determiner>> = new Map<Plex, Map<Plex, Determiner>>();
const immediateDependents: Map<Plex, Plex[]> = new Map<Plex, Plex[]>();

function scheduleUpdates(starters: Plex[]): Schedule {
	const starterSet: Set<Plex> = new Set<Plex>(starters);
	
	const scheduleSet: Set<Plex> = new Set<Plex>();
	const determiners: Map<Plex, Determiner> = new Map<Plex, Determiner>();

	let primaryQueue: Plex[] = starters.filter(starter => immediateDependents.has(starter));
	let secondaryQueue: Plex[] = []

	while (primaryQueue.length) {
		for (const antecedent of primaryQueue) {
			if (!immediateDependents.has(antecedent)) continue;
			
			for (const dependent of immediateDependents.get(antecedent)!) {
				if (starterSet.has(dependent)) continue;
				
				if (scheduleSet.has(dependent)) {
					for (const plex of determiners.get(dependent)!.antecedents) {
						if (plex === antecedent) {
							scheduleSet.delete(dependent);
							break;
						}
					}
				} else {
					secondaryQueue.push(dependent);
					const determiner: Determiner = relations.get(antecedent)!.get(dependent)!;
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

function assignValues(assignments: Assignment[]): void {
	for (const { assignee, newValue } of assignments) {
		values.set(assignee, newValue);
	}

	const starters = assignments.map(assignment => assignment.assignee);
	const { scheduleSet, determiners } = scheduleUpdates(starters);
	
	for (const dependent of scheduleSet) {
		const { fn, antecedents } = determiners.get(dependent)!;
		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const newValue: any = fn.apply(null, args);
		values.set(dependent, newValue);
	}
}

export default class Plex {
	constructor({
		initialValue
	}: PlexArgs = {}) {
		values.set(this, initialValue);
	}

	public get value(): any {
		return values.get(this)!;
	}

	public set value(newValue: any) {
		assignValues([ { assignee: this, newValue } ]);
	}

	public assign(newValue: any) {
		assignValues([ { assignee: this, newValue } ]);
	}

	static define(fn: RelationFn,  antecedents: Plex[]): Plex {
		if (antecedents.length === 0) return new Plex();

		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const initialValue: any = fn.apply(null, args);
		const newPlex: Plex = new Plex({ initialValue });

		const determiner: Determiner = { fn, antecedents };
		
		for (const antecedent of antecedents) {
			if (!relations.has(antecedent)) {
				relations.set(antecedent, new Map<Plex, Determiner>());
				immediateDependents.set(antecedent, []);
			}
			
			relations.get(antecedent)!.set(newPlex, determiner);
			immediateDependents.get(antecedent)!.push(newPlex);
		}
		
		return newPlex;
	}

	static addRelation(dependent: Plex, fn: RelationFn, antecedents: Plex[]) {
		if (antecedents.length === 0 || (antecedents.length === 1 && antecedents[0] === dependent)) return;
		if (antecedents.some(antecedent => relations.get(antecedent)?.has(dependent))) return;

		const determiner: Determiner = { fn, antecedents };
		
		for (const antecedent of antecedents) {
			if (antecedent === dependent) continue;

			if (!relations.has(antecedent)) {
				relations.set(antecedent, new Map<Plex, Determiner>());
				immediateDependents.set(antecedent, []);
			}
			
			relations.get(antecedent)!.set(dependent, determiner);
			immediateDependents.get(antecedent)!.push(dependent);
		}

		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const newValue = fn.apply(null, args);
		values.set(dependent, newValue);
	}

	static assign(assignments: Assignment[]) {
		if (assignments.length === 0) return;
		assignValues(assignments);
	}
}
