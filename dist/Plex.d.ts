type RelationFn = (...args: any[]) => any;
type Assignment = [Plex, any];
type PlexArgs = {
    initialValue?: any;
};
export default class Plex {
    constructor({ initialValue }?: PlexArgs);
    get value(): any;
    set value(newValue: any);
    assign(newValue: any): void;
    static define(fn: RelationFn, antecedents: Plex[]): Plex;
    static addRelation(dependent: Plex, fn: RelationFn, antecedents: Plex[]): void;
    static assign(assignments: Assignment[]): void;
    static assignAsync(assignments: Assignment[]): Promise<void>;
}
export {};
//# sourceMappingURL=Plex.d.ts.map