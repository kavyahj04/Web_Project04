export default function makeApp(wsUrl: string): App;
declare class App {
    private readonly wsUrl;
    private readonly ws;
    private readonly result;
    private readonly errors;
    private readonly search;
    constructor(wsUrl: string);
    private handleSearchBlur;
    private loadSearchResults;
    private renderSearchResults;
    private showBookDetails;
    private attachCheckoutHandler;
    private refreshBorrowers;
    /** unwrap a result, displaying errors if !result.isOk,
     *  returning T otherwise.   Use as if (unwrap(result)) { ... }
     *  when T !== void.
     */
    private unwrap;
    /** clear out all errors */
    private clearErrors;
}
export {};
//# sourceMappingURL=app.d.ts.map