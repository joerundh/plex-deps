type RelationFn = (...args: any[]) => any;
type AsyncRelationFn = (...args: (any | Promise<any>)[]) => any | Promise<any>;

type Determiner = { antecedents: Plex[], fn: RelationFn | AsyncRelationFn };
type Order = [ Set<Plex>, Map<Plex, Determiner> ];

type Assignment = [ Plex, any ];
type AsyncAssignment = [ Plex, any | Promise<any> ];

const values: Map<Plex, any> = new Map<Plex, any>();
const relations: Map<Plex, Map<Plex, Determiner>> = new Map<Plex, Map<Plex, Determiner>>();
const immediateDependents: Map<Plex, Plex[]> = new Map<Plex, Plex[]>();

function computeOrder(starters: Plex[]): Order {
	const startersSet: Set<Plex> = new Set<Plex>(starters);
	
	const order: Set<Plex> = new Set<Plex>();
	const determiners: Map<Plex, Determiner> = new Map<Plex, Determiner>();

	let primaryQueue: Plex[] = starters.filter(starter => immediateDependents.has(starter));
	let secondaryQueue: Plex[] = []

	while (primaryQueue.length) {
		for (const antecedent of primaryQueue) {
			if (!immediateDependents.has(antecedent)) continue;
			
			for (const dependent of immediateDependents.get(antecedent)!) {
				if (startersSet.has(dependent)) continue;
				
				if (order.has(dependent)) {
					for (const plex of determiners.get(dependent)!.antecedents) {
						if (plex === antecedent) {
							order.delete(dependent);
							break;
						}
					}
				} else {
					secondaryQueue.push(dependent);
					const determiner: Determiner = relations.get(antecedent)!.get(dependent)!;
					determiners.set(dependent, determiner);
				}
				order.add(dependent);
			}
		}

		primaryQueue = secondaryQueue;
		secondaryQueue = [];
	}

	return [ order, determiners ];
}

function assignValues(assignments: Assignment[]): void {
	const starters: Plex[] = new Array(assignments.length);
	
	for (let i = 0; i < assignments.length; i++) {
		const [ starter, newStarterValue ]: Assignment = assignments[i]!;
		starters[i] = starter;
		values.set(starter, newStarterValue);
	}

	const [ order, determiners ]: Order = computeOrder(starters);
	
	for (const dependent of order) {
		const { antecedents, fn } = determiners.get(dependent)!;
		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const newValue: any = fn(...args);
		values.set(dependent, newValue);
	}
}

async function assignValuesAsync(assignments: AsyncAssignment[]): Promise<void> {
	const starters: Plex[] = new Array(assignments.length);
	
	const updatePromises: Map<Plex, Promise<any>> = new Map<Plex, Promise<any>>();

	for (let i = 0; i < assignments.length; i++) {
		const [ starter, newStarterValue ]: Assignment = assignments[i]!;
		
		starters[i] = starter;

		const starterPromise = Promise.resolve(newStarterValue)
			.then((resolvedValue: any): void => {
				values.set(starter, resolvedValue);
				return;
			});
		updatePromises.set(starter, starterPromise);
	}

	const [ order, determiners ]: Order = computeOrder(starters);

	for (const dependent of order) {
		const { antecedents, fn } = determiners.get(dependent)!;

		const antecedentsPromises: Promise<any>[] = antecedents.map((antecedent: Plex): Promise<any> => Promise.resolve(updatePromises.get(antecedent) ?? values.get(antecedent)!));
		
		const dependentPromise = Promise.all(antecedentsPromises)
			.then((resolvedArgs: any): Promise<any> => fn(...resolvedArgs))
			.then((newValue: any): void => {
				values.set(dependent, newValue);
				return;	
			});
		
		updatePromises.set(dependent, dependentPromise);
	}

	await Promise.all(updatePromises.values());
}

function addRelation(dependent: Plex, antecedents: Plex[], fn: RelationFn | AsyncRelationFn): void {
	const determiner: Determiner = { antecedents, fn };
			
	for (const antecedent of antecedents) {
		if (antecedent === dependent) continue;

		if (!relations.has(antecedent)) {
			relations.set(antecedent, new Map<Plex, Determiner>());
			immediateDependents.set(antecedent, []);
		}
		
		relations.get(antecedent)!.set(dependent, determiner);
		immediateDependents.get(antecedent)!.push(dependent);
	}
}

function createDependent(initial: any, antecedents: Plex[], fn: RelationFn | AsyncRelationFn) {
	const newPlex: Plex = new Plex(initial);

	addRelation(newPlex, antecedents, fn);

	return newPlex;
}

export default class Plex {
	constructor(...args: any[]) {
		const initial: any = args.length ? args[0] : undefined;
		values.set(this, initial);
	}

	public get value(): any {
		return values.get(this)!;
	}

	public set value(newValue: any) {
		assignValues([ [ this, newValue ] ]);
	}

	public assign(newValue: any): void {
		assignValues([ [ this, newValue ] ]);
	}

	public async assignAsync(newValue: any | Promise<any>): Promise<void> {
		await assignValuesAsync([ [ this, newValue ] ]);
	}

	static define(antecedents: Plex[], fn: RelationFn): Plex {
		if (antecedents.length === 0) {
			const initial: any = fn();
			return new Plex(initial);
		}

		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const initial: any = fn(...args);
		
		return createDependent(initial, antecedents, fn);
	}

	static async defineAsync(antecedents: Plex[], fn: AsyncRelationFn): Promise<Plex> {
		if (antecedents.length === 0) {
			const initial: any = await fn();
			return new Plex(initial);
		}

		const args: any[] = await Promise.all(antecedents.map(antecedent => values.get(antecedent)!));
		const initial: any = await fn(...args);

		return createDependent(initial, antecedents, fn);
	}

	static relate(dependent: Plex, antecedents: Plex[], fn: RelationFn): void {
		if (antecedents.length === 0 || (antecedents.length === 1 && antecedents[0] === dependent)) return;
		if (antecedents.some(antecedent => relations.get(antecedent)?.has(dependent))) return;

		addRelation(dependent, antecedents, fn)

		const args: any[] = antecedents.map(antecedent => values.get(antecedent)!);
		const newValue = fn(...args);
		values.set(dependent, newValue);
	}

	static async relateAsync(dependent: Plex, antecedents: Plex[], fn: AsyncRelationFn): Promise<void> {
		if (antecedents.length === 0 || (antecedents.length === 1 && antecedents[0] === dependent)) return;
		if (antecedents.some(antecedent => relations.get(antecedent)?.has(dependent))) return;

		addRelation(dependent, antecedents, fn)

		const args: any[] = await Promise.all(antecedents.map(antecedent => values.get(antecedent)!));
		const newValue = await fn(...args);
		values.set(dependent, newValue);
	}

	static assign(assignments: Assignment[]): void {
		if (assignments.length === 0) return;
		assignValues(assignments);
	}

	static async assignAsync(assignments: Assignment[]): Promise<void> {
		if (assignments.length === 0) return;
		await assignValuesAsync(assignments);
	}
}
