type RelationFn = (...args: any[]) => any;
type AsyncRelationFn = (...args: (any | Promise<any>)[]) => any | Promise<any>;
type Assignment = [Plex, any];
export default class Plex {
    constructor(...args: any[]);
    get value(): any;
    set value(newValue: any);
    assign(newValue: any): void;
    assignAsync(newValue: any | Promise<any>): Promise<void>;
    relate(antecedents: Plex[], fn: RelationFn): void;
    relateAsync(antecedents: Plex[], fn: AsyncRelationFn): Promise<void>;
    static assign(assignments: Assignment[]): void;
    static assignAsync(assignments: Assignment[]): Promise<void>;
    static define(antecedents: Plex[], fn: RelationFn): Plex;
    static defineAsync(antecedents: Plex[], fn: AsyncRelationFn): Promise<Plex>;
    static relate(dependent: Plex, antecedents: Plex[], fn: RelationFn): void;
    static relateAsync(dependent: Plex, antecedents: Plex[], fn: AsyncRelationFn): Promise<void>;
}
export {};
//# sourceMappingURL=Plex.d.ts.map