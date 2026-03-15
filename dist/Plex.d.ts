type RelationFn = (...args: any[]) => any;
type PlexArgs = {
    initialValue?: any;
};
type Assignment = {
    assignee: Plex;
    newValue: any;
};
export default class Plex {
    constructor({ initialValue }?: PlexArgs);
    get value(): any;
    set value(newValue: any);
    assign(newValue: any): void;
    static define(fn: RelationFn, antecedents: Plex[]): Plex;
    static addRelation(dependent: Plex, fn: RelationFn, antecedents: Plex[]): void;
    static assign(assignments: Assignment[]): void;
}
export {};
//# sourceMappingURL=Plex.d.ts.map